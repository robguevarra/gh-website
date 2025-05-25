import jwt from 'jsonwebtoken'
import { getAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

// Magic link configuration
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const MAGIC_LINK_EXPIRATION = process.env.MAGIC_LINK_EXPIRATION_HOURS || '48h'
const RATE_LIMIT_MAX_LINKS = parseInt(process.env.MAGIC_LINK_RATE_LIMIT_PER_HOUR || '5')
const BASE_URL = process.env.MAGIC_LINK_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://gracefulhomeschooling.com'

// Magic link interfaces
export interface MagicLinkOptions {
  email: string
  purpose: 'account_setup' | 'login' | 'shopify_access'
  redirectTo?: string
  expiresIn?: string // Default: 48 hours
  metadata?: Record<string, any>
}

export interface MagicLinkResult {
  success: boolean
  magicLink?: string
  token?: string
  expiresAt?: string
  error?: string
}

export interface MagicLinkValidation {
  success: boolean
  email?: string
  purpose?: string
  userId?: string
  metadata?: Record<string, any>
  error?: string
  expired?: boolean
  used?: boolean
}

/**
 * Generate a secure magic link with JWT token
 * Includes rate limiting and database storage
 */
export async function generateMagicLink(options: MagicLinkOptions): Promise<MagicLinkResult> {
  try {
    const supabase = getAdminClient()
    const { email, purpose, redirectTo, expiresIn = MAGIC_LINK_EXPIRATION, metadata = {} } = options

    // 1. Rate limiting check - max 5 magic links per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: recentLinks, error: rateLimitError } = await supabase
      .from('magic_links')
      .select('id')
      .eq('email', email)
      .gte('created_at', oneHourAgo)

    if (rateLimitError) {
      console.error('[MagicLink] Rate limit check failed:', rateLimitError)
      return { success: false, error: 'Failed to check rate limits' }
    }

    if (recentLinks && recentLinks.length >= RATE_LIMIT_MAX_LINKS) {
      console.warn(`[MagicLink] Rate limit exceeded for ${email}: ${recentLinks.length} links in past hour`)
      return { 
        success: false, 
        error: `Too many magic links requested. Please wait before requesting another link.` 
      }
    }

    // 2. Generate JWT token with secure payload
    const expirationTime = expiresIn === '48h' ? Date.now() + (48 * 60 * 60 * 1000) : 
                          expiresIn === '24h' ? Date.now() + (24 * 60 * 60 * 1000) :
                          expiresIn === '1h' ? Date.now() + (60 * 60 * 1000) :
                          Date.now() + (48 * 60 * 60 * 1000) // Default 48h

    const tokenPayload = {
      email,
      purpose,
      metadata,
      exp: Math.floor(expirationTime / 1000), // JWT expects seconds
      iat: Math.floor(Date.now() / 1000),
      iss: 'graceful-homeschooling-auth',
      aud: 'magic-link-auth'
    }

    const token = jwt.sign(tokenPayload, MAGIC_LINK_SECRET, { algorithm: 'HS256' })

    // 3. Store in magic_links table
    const expiresAt = new Date(expirationTime).toISOString()
    
    const { data: magicLinkRecord, error: insertError } = await supabase
      .from('magic_links')
      .insert({
        token,
        email,
        purpose,
        metadata,
        expires_at: expiresAt,
        // user_id and purchase_lead_id will be null for new users
        ip_address: null, // Will be set during verification
        user_agent: null, // Will be set during verification
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[MagicLink] Failed to store magic link:', insertError)
      return { success: false, error: 'Failed to generate magic link' }
    }

    // 4. Construct magic link URL
    const magicLink = `${BASE_URL}/auth/magic-link/verify/${encodeURIComponent(token)}`
    
    if (redirectTo) {
      const url = new URL(magicLink)
      url.searchParams.set('redirect', redirectTo)
      const finalLink = url.toString()
      
      console.log(`[MagicLink] Generated magic link for ${email}:`, {
        purpose,
        expiresAt,
        redirectTo,
        recordId: magicLinkRecord.id
      })

      return {
        success: true,
        magicLink: finalLink,
        token,
        expiresAt
      }
    }

    console.log(`[MagicLink] Generated magic link for ${email}:`, {
      purpose,
      expiresAt,
      recordId: magicLinkRecord.id
    })

    return {
      success: true,
      magicLink,
      token,
      expiresAt
    }

  } catch (error) {
    console.error('[MagicLink] Error generating magic link:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error generating magic link' 
    }
  }
}

/**
 * Validate and use a magic link token
 * Marks token as used and returns user information
 */
export async function validateMagicLink(
  token: string, 
  ipAddress?: string, 
  userAgent?: string
): Promise<MagicLinkValidation> {
  try {
    const supabase = getAdminClient()

    // 1. Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, MAGIC_LINK_SECRET, { 
        algorithms: ['HS256'],
        issuer: 'graceful-homeschooling-auth',
        audience: 'magic-link-auth'
      })
    } catch (jwtError) {
      console.error('[MagicLink] JWT verification failed:', jwtError)
      
      if (jwtError instanceof jwt.TokenExpiredError) {
        return { success: false, error: 'Magic link has expired', expired: true }
      }
      
      return { success: false, error: 'Invalid magic link token' }
    }

    // 2. Check if token exists in database and hasn't been used
    const { data: magicLinkRecord, error: lookupError } = await supabase
      .from('magic_links')
      .select('id, email, purpose, user_id, metadata, used_at, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (lookupError) {
      console.error('[MagicLink] Database lookup failed:', lookupError)
      return { success: false, error: 'Failed to validate magic link' }
    }

    if (!magicLinkRecord) {
      console.warn('[MagicLink] Token not found in database:', token.substring(0, 20) + '...')
      return { success: false, error: 'Magic link not found' }
    }

    // 3. Check if already used (single-use enforcement)
    if (magicLinkRecord.used_at) {
      console.warn(`[MagicLink] Token already used at ${magicLinkRecord.used_at} for ${magicLinkRecord.email}`)
      return { 
        success: false, 
        error: 'Magic link has already been used', 
        used: true,
        email: magicLinkRecord.email // Always include email for refresh functionality
      }
    }

    // 4. Check if expired (double-check beyond JWT)
    const now = new Date()
    const expiresAt = new Date(magicLinkRecord.expires_at)
    
    if (now > expiresAt) {
      console.warn(`[MagicLink] Token expired at ${magicLinkRecord.expires_at} for ${magicLinkRecord.email}`)
      return { 
        success: false, 
        error: 'Magic link has expired', 
        expired: true,
        email: magicLinkRecord.email // Always include email for refresh functionality
      }
    }

    // 5. Mark token as used
    const { error: updateError } = await supabase
      .from('magic_links')
      .update({
        used_at: now.toISOString(),
        ip_address: ipAddress || null,
        user_agent: userAgent || null
      })
      .eq('id', magicLinkRecord.id)

    if (updateError) {
      console.error('[MagicLink] Failed to mark token as used:', updateError)
      // Continue anyway - validation was successful
    }

    console.log(`[MagicLink] Successfully validated magic link for ${magicLinkRecord.email}:`, {
      purpose: magicLinkRecord.purpose,
      userId: magicLinkRecord.user_id,
      recordId: magicLinkRecord.id
    })

    return {
      success: true,
      email: magicLinkRecord.email,
      purpose: magicLinkRecord.purpose,
      userId: magicLinkRecord.user_id || undefined,
      metadata: magicLinkRecord.metadata || {}
    }

  } catch (error) {
    console.error('[MagicLink] Error validating magic link:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error validating magic link' 
    }
  }
}

/**
 * Generate a fresh magic link when an expired or used token is accessed
 * Industry best practice for user-friendly experience
 */
export async function refreshExpiredMagicLink(
  token: string,
  options?: Partial<MagicLinkOptions>
): Promise<MagicLinkResult> {
  try {
    // STEP 1: First try to get the token info directly from the database
    // This is the most reliable approach - works for valid, expired, AND used tokens
    const supabase = getAdminClient()
    const { data: tokenData, error: dbError } = await supabase
      .from('magic_links')
      .select('email, purpose, metadata, used_at')
      .eq('token', token)
      .maybeSingle()
      
    if (tokenData?.email) {
      console.log(`[MagicLink] Found token in database for: ${tokenData.email}`)
      
      // STEP 2A: Database lookup successful - generate new token using info from DB
      return await generateMagicLink({
        email: tokenData.email,
        purpose: tokenData.purpose as 'account_setup' | 'login' | 'shopify_access',
        metadata: { 
          ...(typeof tokenData.metadata === 'object' ? tokenData.metadata : {}),
          ...(options?.metadata || {}),
          refreshedFrom: 'database_lookup',
          originalTokenStatus: tokenData.used_at ? 'used' : 'unknown'
        },
        redirectTo: options?.redirectTo,
        expiresIn: options?.expiresIn || MAGIC_LINK_EXPIRATION
      })
    }
    
    // STEP 2B: If not in DB, fall back to decoding the JWT (less reliable)
    console.log('[MagicLink] Token not found in database, attempting JWT decode')
    let decoded: any
    try {
      decoded = jwt.verify(token, MAGIC_LINK_SECRET, { 
        ignoreExpiration: true // Allow expired tokens for refresh
      })
    } catch (error) {
      console.error('[MagicLink] Cannot decode token for refresh:', error)
      return { success: false, error: 'Cannot refresh invalid magic link' }
    }

    // Generate new magic link with same purpose and metadata
    const refreshOptions: MagicLinkOptions = {
      email: decoded.email,
      purpose: decoded.purpose,
      metadata: { ...decoded.metadata, ...options?.metadata },
      redirectTo: options?.redirectTo,
      expiresIn: options?.expiresIn || MAGIC_LINK_EXPIRATION
    }

    console.log(`[MagicLink] Refreshing expired magic link for ${decoded.email}:`, {
      originalPurpose: decoded.purpose,
      newExpiresIn: refreshOptions.expiresIn
    })

    return await generateMagicLink(refreshOptions)

  } catch (error) {
    console.error('[MagicLink] Error refreshing expired magic link:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error refreshing magic link' 
    }
  }
}

/**
 * Clean up expired magic links from database
 * Should be called periodically via cron job
 */
export async function cleanupExpiredLinks(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const supabase = getAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('magic_links')
      .delete()
      .lt('expires_at', now)
      .select('id')

    if (error) {
      console.error('[MagicLink] Failed to cleanup expired links:', error)
      return { success: false, error: 'Failed to cleanup expired links' }
    }

    const deletedCount = data?.length || 0
    console.log(`[MagicLink] Cleaned up ${deletedCount} expired magic links`)

    return { success: true, deletedCount }

  } catch (error) {
    console.error('[MagicLink] Error during cleanup:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during cleanup' 
    }
  }
} 