import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
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

    // Check if this is a password reset token before validation
    let isPwdReset = false
    try {
      // Just decode without verification to check purpose
      const decoded = jwt.decode(token)
      if (decoded && typeof decoded === 'object' && decoded.purpose === 'password_reset') {
        isPwdReset = true
        console.log('[MagicLinkVerifyAPI] GET: Detected password reset token - not marking as used yet')
      }
    } catch (e) {
      // Ignore decode errors, full validation will happen next
    }
    
    // Don't mark as used for password reset tokens during verification
    const validation = await validateMagicLink(token, ipAddress, userAgent, !isPwdReset)

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
    
    // Handle password reset specially
    let finalRedirectPath = redirectTo
    if (validation.purpose === 'password_reset') {
      console.log('[MagicLinkVerifyAPI] Password reset purpose detected, redirecting to update-password')
      finalRedirectPath = '/auth/update-password'
    }

    // Return verification success with flow information
    // Note: Session creation handled client-side for security and flexibility
    const response = {
      success: true,
      verification: {
        email: validation.email,
        purpose: validation.purpose,
        userId: validation.userId,
        token: token // Include token for password reset flow
      },
      classification: {
        type: classification.type,
        isExistingUser: classification.isExistingUser,
        enrollmentStatus: classification.enrollmentStatus
      },
      authFlow: {
        purpose: authFlow.magicLinkPurpose,
        redirectPath: finalRedirectPath,
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

    // Check if this is a password reset token before validation
    let isPwdReset = false
    try {
      // Just decode without verification to check purpose
      const decoded = jwt.decode(token)
      if (decoded && typeof decoded === 'object' && decoded.purpose === 'password_reset') {
        isPwdReset = true
        console.log('[MagicLinkVerifyAPI] POST: Detected password reset token - not marking as used yet')
      }
    } catch (e) {
      // Ignore decode errors, full validation will happen next
    }
    
    // Don't mark as used for password reset tokens during verification
    const validation = await validateMagicLink(token, ipAddress, userAgent, !isPwdReset)

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

    const classification = classificationResult.classification!;
    const authFlow = getAuthenticationFlow(classification);
    let redirectPath = redirectTo || authFlow.redirectPath;

    // Handle password reset specially - this should take precedence
    if (validation.purpose === 'password_reset') {
      console.log('[MagicLinkVerifyAPI-POST] Password reset purpose detected, redirecting to update-password');
      redirectPath = '/auth/update-password';
    } else if (createSession && validation.userId) {
      // If not a password reset, and we are creating a session, determine role-based redirect
      try {
        const adminSupabase = getAdminClient();
        const { data: profile, error: profileError } = await adminSupabase
          .from('unified_profiles')
          .select('is_student, is_affiliate, is_admin')
          .eq('id', validation.userId)
          .single();

        if (profileError || !profile) {
          console.error(`[MagicLinkVerifyAPI-POST] Error fetching profile for user ${validation.userId} or profile not found. Falling back to default redirect.`, profileError);
          // redirectPath remains as determined by authFlow or defaults to /dashboard later if needed
        } else {
          console.log(`[MagicLinkVerifyAPI-POST] Profile fetched for ${validation.userId}:`, profile);
          // Role-based redirection priority: Admin > Affiliate > Student
          if (profile.is_admin) {
            redirectPath = '/admin';
            console.log(`[MagicLinkVerifyAPI-POST] Redirecting admin user ${validation.userId} to /admin`);
          } else if (profile.is_affiliate) {
            redirectPath = '/affiliate-portal';
            console.log(`[MagicLinkVerifyAPI-POST] Redirecting affiliate user ${validation.userId} to /affiliate-portal`);
          } else if (profile.is_student) {
            redirectPath = '/dashboard'; // Explicitly set for student, or if it's the only role
            console.log(`[MagicLinkVerifyAPI-POST] Redirecting student user ${validation.userId} to /dashboard`);
          } else {
            // Fallback if no specific role flag is true but user is authenticated and profile exists
            // This might happen if roles are not yet set, or if it's a new user type without a specific dashboard
            redirectPath = '/dashboard'; 
            console.log(`[MagicLinkVerifyAPI-POST] No specific role for ${validation.userId}, defaulting to /dashboard`);
          }
        }
      } catch (e) {
        console.error('[MagicLinkVerifyAPI-POST] Unexpected error during profile fetch for redirect. Falling back.', e);
        // redirectPath remains as determined by authFlow or defaults to /dashboard later
      }
    }

    let sessionResult = null
    let profileStatus = {
      isComplete: false,
      message: ''
    }
    
    console.log(`[MagicLinkVerifyAPI] POST handler - checking for existing password`)
    console.log(`[MagicLinkVerifyAPI] POST purpose:`, validation.purpose)
    console.log(`[MagicLinkVerifyAPI] POST email:`, validation.email)

    // Extract critical verification information
    
    // SIMPLE PASSWORD CHECK: Users who have set passwords should always go to sign-in
    if (validation.email) {
      try {
        const supabase = getAdminClient()
        const email = validation.email
        
        // IMPORTANT: Extract userId from either direct property or metadata
        // The logs show userId is null but it exists in metadata
        const userId = validation.userId || validation.metadata?.userId
        console.log('[MagicLinkVerifyAPI] Extracted userId:', userId)
        
        let hasPassword = false
        
        // APPROACH 1: Direct lookup by ID if available
        if (userId) {
          const { data, error } = await supabase.auth.admin.getUserById(userId)
          
          if (!error && data?.user?.user_metadata?.password_set_at) {
            hasPassword = true
            console.log(`[MagicLinkVerifyAPI] User has set password at: ${data.user.user_metadata.password_set_at}`)
          }
        }
        
        // APPROACH 2: Fallback to email lookup via unified profiles
        // Also check for migrated users
        let isMigratedUser = false
        if (!hasPassword) {
          const { data: profile } = await supabase
            .from('unified_profiles')
            .select('id, admin_metadata')
            .eq('email', email)
            .maybeSingle()
            
          if (profile?.id) {
            // Check if this is a migrated user
            const metadata = profile.admin_metadata as { source?: string } | null
            if (metadata?.source === 'clean_migration') {
              isMigratedUser = true
              console.log(`[MagicLinkVerifyAPI] User identified as migrated user from clean migration`)
            }
            
            const { data } = await supabase.auth.admin.getUserById(profile.id)
            if (data?.user?.user_metadata?.password_set_at) {
              hasPassword = true
              console.log(`[MagicLinkVerifyAPI] User found via profile lookup, has password`)
            }
          }
        }
        
        // If user has set password and this is NOT a password reset, redirect to signin
        // For password reset, we want to continue even if they have a password
        if (hasPassword && validation.purpose !== 'password_reset') {
          console.log('[MagicLinkVerifyAPI] User has password, redirecting to signin')
          
          // Update status and redirect path
          profileStatus = {
            isComplete: true,
            message: 'You have already set up your password. Please sign in with your email and password.'
          }
          
          redirectPath = '/auth/signin?password_set=true&email=' + encodeURIComponent(email)
          
          // Return early with the signin redirect
          return NextResponse.json({
            success: true,
            verification: {
              email: email,
              purpose: validation.purpose,
              userId: validation.userId
            },
            authFlow: { redirectPath },
            profileStatus,
            session: null
          })
        }
        
        // Migrated users who don't have a password set should go to setup-account
        // This should happen only if they don't have a password and this is not a password reset
        if (isMigratedUser && !hasPassword && validation.purpose !== 'password_reset') {
          console.log('[MagicLinkVerifyAPI] Migrated user without password, redirecting to setup-account')
          redirectPath = '/auth/setup-account?flow=migration'
        }
        
        // Special handling for password reset
        if (validation.purpose === 'password_reset') {
          console.log('[MagicLinkVerifyAPI] Password reset purpose detected in POST method')
          redirectPath = '/auth/update-password'
        }
      } catch (err) {
        console.error('[MagicLinkVerifyAPI] Error checking password status:', err)
        // Continue with normal flow on error
      }
    }
    
    // We've already checked for password status above
    // Continue with normal flow if the user hasn't set a password

    // Create Supabase Auth session if requested and user exists
    if (createSession && validation.userId) {
      sessionResult = await createSupabaseSession(validation.userId, validation.email!)
    }

    const response = {
      success: true,
      verification: {
        email: validation.email,
        purpose: validation.purpose,
        userId: validation.userId,
        token: token // Include token for password reset flow
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
      // Always include metadata - this is critical for client-side password checks
      metadata: validation.metadata || {},
      profileStatus: profileStatus,
      session: sessionResult
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