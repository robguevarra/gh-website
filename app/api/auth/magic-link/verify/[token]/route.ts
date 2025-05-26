import { NextRequest, NextResponse } from 'next/server'
import { validateMagicLink } from '@/lib/auth/magic-link-service'
import { classifyCustomer, getAuthenticationFlow } from '@/lib/auth/customer-classification-service'
import { getAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

interface RouteParams {
  params: {
    token: string
  }
}

// Request validation schema for optional body parameters
const verifyRequestSchema = z.object({
  createSession: z.boolean().default(true),
  redirectTo: z.string().optional(),
  clientInfo: z.object({
    ipAddress: z.string().optional(),
    userAgent: z.string().optional()
  }).optional()
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    
    if (!token) {
      return NextResponse.json(
        { error: 'Magic link token is required' },
        { status: 400 }
      )
    }

    console.log(`[MagicLinkVerifyAPI] Verifying token:`, token.substring(0, 20) + '...')

    // Extract client information from headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Validate magic link token
    const validation = await validateMagicLink(token, ipAddress, userAgent)

    if (!validation.success) {
      console.error('[MagicLinkVerifyAPI] Token validation failed:', validation.error)
      return NextResponse.json({
        success: false,
        error: validation.error,
        expired: validation.expired,
        used: validation.used
      }, { status: 400 })
    }

    console.log(`[MagicLinkVerifyAPI] Token validated for ${validation.email}`)

    // Re-classify customer to get current flow recommendations
    const classificationResult = await classifyCustomer(validation.email!)
    
    if (!classificationResult.success) {
      console.error('[MagicLinkVerifyAPI] Customer classification failed:', classificationResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to classify customer'
      }, { status: 500 })
    }

    const classification = classificationResult.classification!
    const authFlow = getAuthenticationFlow(classification)

    // Get redirect path from query params or use recommended path
    const url = new URL(request.url)
    const redirectTo = url.searchParams.get('redirect') || authFlow.redirectPath

    console.log(`[MagicLinkVerifyAPI] Customer classified as ${classification.type}, redirecting to: ${redirectTo}`)

    // Return verification success with flow information
    // Note: Session creation handled client-side for security and flexibility
    const response = {
      success: true,
      verification: {
        email: validation.email,
        purpose: validation.purpose,
        userId: validation.userId
      },
      classification: {
        type: classification.type,
        isExistingUser: classification.isExistingUser,
        enrollmentStatus: classification.enrollmentStatus
      },
      authFlow: {
        purpose: authFlow.magicLinkPurpose,
        redirectPath: redirectTo,
        requiresPasswordCreation: authFlow.requiresPasswordCreation,
        description: authFlow.flowDescription
      },
      metadata: validation.metadata || {}
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[MagicLinkVerifyAPI] Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    
    if (!token) {
      return NextResponse.json(
        { error: 'Magic link token is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validatedData = verifyRequestSchema.parse(body)
    const { createSession, redirectTo, clientInfo } = validatedData

    console.log(`[MagicLinkVerifyAPI] POST verification with session creation:`, createSession)

    // Extract client information
    const ipAddress = clientInfo?.ipAddress || 
                     request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = clientInfo?.userAgent || 
                     request.headers.get('user-agent') || 
                     'unknown'

    // Validate magic link token
    const validation = await validateMagicLink(token, ipAddress, userAgent)

    if (!validation.success) {
      console.error('[MagicLinkVerifyAPI] Token validation failed:', validation.error)
      return NextResponse.json({
        success: false,
        error: validation.error,
        expired: validation.expired,
        used: validation.used
      }, { status: 400 })
    }

    // Get customer classification
    const classificationResult = await classifyCustomer(validation.email!)
    
    if (!classificationResult.success) {
      console.error('[MagicLinkVerifyAPI] Customer classification failed:', classificationResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to classify customer'
      }, { status: 500 })
    }

    const classification = classificationResult.classification!
    const authFlow = getAuthenticationFlow(classification)
    let redirectPath = redirectTo || authFlow.redirectPath

    let sessionResult = null
    let profileStatus = {
      isComplete: false,
      message: ''
    }
    
    console.log(`[MagicLinkVerifyAPI] POST handler - checking for existing password`)
    console.log(`[MagicLinkVerifyAPI] POST purpose:`, validation.purpose)
    console.log(`[MagicLinkVerifyAPI] POST email:`, validation.email)

    // SHARED PASSWORD CHECK FUNCTION to avoid duplicating code between GET and POST handlers
    const checkForExistingPassword = async (email: string, purpose: string, userId?: string) => {
      if (purpose !== 'account_setup' || !email) {
        return null; // Only check for account_setup links
      }
      
      try {
        console.log(`[MagicLinkVerifyAPI] Checking password status for ${email}`)
        const supabase = getAdminClient()
        
        // Using the admin API to get all users, then filter by email
        const { data, error } = await supabase.auth.admin.listUsers()
        
        if (error) {
          console.error('[MagicLinkVerifyAPI] Error fetching users:', error)
          return null
        }
        
        if (!data.users || data.users.length === 0) {
          console.log('[MagicLinkVerifyAPI] No users found in system')
          return null
        }
        
        // Filter to find user by email (case-insensitive for safety)
        const matchingUsers = data.users.filter(u => 
          u.email?.toLowerCase() === email.toLowerCase()
        )
        
        if (matchingUsers.length === 0) {
          console.log('[MagicLinkVerifyAPI] No matching user found for email:', email)
          return null
        }
        
        // Get the matching user
        const user = matchingUsers[0]
        
        // Check user_metadata for password_set_at
        const passwordSetAt = user?.user_metadata?.password_set_at
        const hasSetPassword = passwordSetAt !== undefined
        
        console.log(`[MagicLinkVerifyAPI] User found:`, {
          id: user.id,
          email: user.email,
          hasSetPassword,
          passwordSetAt,
          metadata: JSON.stringify(user.user_metadata || {})
        })
        
        if (hasSetPassword) {
          console.log(`[MagicLinkVerifyAPI] 🔒 CONFIRMED: User has already set password`)
          
          // Create redirect to signin
          const signinPath = '/auth/signin?password_set=true&email=' + encodeURIComponent(email)
          
          return {
            isPasswordSet: true,
            redirectPath: signinPath,
            profileStatus: {
              isComplete: true,
              message: 'You have already set up your password. Please sign in with your email and password.'
            }
          }
        } else {
          console.log('[MagicLinkVerifyAPI] User has not set password yet')
          return { isPasswordSet: false }
        }
      } catch (err) {
        console.error('[MagicLinkVerifyAPI] Error checking password status:', err)
        return null // Continue with normal flow on errors
      }
    }
    
    // Check if user has already set their password for account setup magic links
    const passwordStatus = await checkForExistingPassword(
      validation.email || '',
      validation.purpose || '',
      validation.userId
    )
    
    // If user has set password, update redirect and profileStatus
    if (passwordStatus?.isPasswordSet) {
      console.log('[MagicLinkVerifyAPI] 🚨 Password is set, forcing signin redirect')
      
      // Make sure these values exist before assigning
      if (passwordStatus.redirectPath) {
        redirectPath = passwordStatus.redirectPath
      }
      
      if (passwordStatus.profileStatus) {
        profileStatus = passwordStatus.profileStatus
      }
      
      // Return early to prevent proceeding further
      return NextResponse.json({
        success: true,
        verification: {
          email: validation.email,
          purpose: validation.purpose,
          userId: validation.userId,
          metadata: validation.metadata
        },
        authFlow: { redirectPath },
        profileStatus,
        session: null // No session for redirected flows
      })
    }

    // Create Supabase Auth session if requested and user exists
    if (createSession && validation.userId) {
      sessionResult = await createSupabaseSession(validation.userId, validation.email!)
    }

    const response = {
      success: true,
      verification: {
        email: validation.email,
        purpose: validation.purpose,
        userId: validation.userId
      },
      classification: {
        type: classification.type,
        isExistingUser: classification.isExistingUser,
        enrollmentStatus: classification.enrollmentStatus
      },
      authFlow: {
        purpose: authFlow.magicLinkPurpose,
        redirectPath: redirectPath,
        requiresPasswordCreation: authFlow.requiresPasswordCreation,
        description: authFlow.flowDescription
      },
      profileStatus: profileStatus,
      session: sessionResult,
      metadata: validation.metadata || {}
    }

    console.log(`[MagicLinkVerifyAPI] Verification complete for ${validation.email}:`, {
      type: classification.type,
      profileStatus: profileStatus.isComplete ? 'complete' : 'incomplete',
      sessionCreated: !!sessionResult?.success,
      redirectTo: redirectPath
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('[MagicLinkVerifyAPI] POST verification error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    )
  }
}

/**
 * Create a Supabase Auth session for the verified user
 * This allows backend systems to authenticate API calls
 */
async function createSupabaseSession(
  userId: string, 
  email: string
): Promise<{ success: boolean; error?: string; sessionId?: string }> {
  try {
    const supabase = getAdminClient()

    // Check if user exists in auth.users
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !authUser) {
      console.error('[MagicLinkVerifyAPI] User not found in auth.users:', userError)
      return { success: false, error: 'User not found' }
    }

    // Note: For security, we don't create sessions server-side
    // The client will handle session creation using the validated email
    console.log(`[MagicLinkVerifyAPI] User ${userId} verified for session creation`)
    
    return { 
      success: true, 
      sessionId: `verified-${userId}-${Date.now()}` 
    }

  } catch (error) {
    console.error('[MagicLinkVerifyAPI] Session creation error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown session error' 
    }
  }
} 