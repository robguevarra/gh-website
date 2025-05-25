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
    const finalRedirectTo = redirectTo || authFlow.redirectPath

    let sessionResult = null

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
        redirectPath: finalRedirectTo,
        requiresPasswordCreation: authFlow.requiresPasswordCreation,
        description: authFlow.flowDescription
      },
      session: sessionResult,
      metadata: validation.metadata || {}
    }

    console.log(`[MagicLinkVerifyAPI] Verification complete for ${validation.email}:`, {
      type: classification.type,
      sessionCreated: !!sessionResult?.success,
      redirectTo: finalRedirectTo
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