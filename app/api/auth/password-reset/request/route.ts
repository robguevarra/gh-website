import { generateMagicLink } from '@/lib/auth/magic-link-service';
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service';
import { createClient } from '@supabase/supabase-js';
import { detectInvalidBcryptHash } from '@/lib/auth/hash-validation-service';
import { captureAuthError } from '@/lib/auth/auth-error-monitor';

// Create direct admin client - needed to avoid auth session issues
function getDirectAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: Request) {
  console.log('[PasswordReset] Processing password reset request');
  try {
    const { email, requestOrigin } = await request.json();
    
    if (!email) {
      return Response.json({ 
        success: false, 
        error: 'Email is required' 
      }, { status: 400 });
    }
    
    // CRITICAL: Check for invalid bcrypt hash BEFORE generating magic link
    console.log('[PasswordReset] Checking for invalid bcrypt hash...');
    const hashDetection = await detectInvalidBcryptHash(email);
    
    if (hashDetection.status === 'invalid_temp_hash') {
      console.log('[PasswordReset] Invalid hash detected, returning direct setup response');
      return Response.json({ 
        success: true, 
        directSetup: true, 
        email: email.toLowerCase(),
        message: "Let's set up your password directly"
      });
    }
    
    console.log(`[PasswordReset] Hash status: ${hashDetection.status}, continuing with normal flow`);
    
    // Fetch user profile to get the first name if available
    let firstName = 'User';
    try {
      const supabase = getDirectAdminClient();
      const { data: profile } = await supabase
        .from('unified_profiles')
        .select('first_name, last_name')
        .eq('email', email)
        .maybeSingle();
      
      if (profile?.first_name) {
        firstName = profile.first_name;
      } else {
        // Still proceed with sending email even if profile doesn't exist
        console.log(`[PasswordReset] No profile found for ${email}, using default name`);
      }
    } catch (profileError) {
      console.error('[PasswordReset] Error fetching profile:', profileError);
      // Continue with default name if profile fetch fails
    }
    
    // Generate magic link with 'password_reset' purpose
    console.log(`[PasswordReset] Generating magic link for ${email}`);
    const result = await generateMagicLink({
      email,
      purpose: 'password_reset',
      redirectTo: '/auth/update-password',
      expiresIn: '24h',
      metadata: {
        requestedFrom: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          requestOrigin,
          timestamp: new Date().toISOString()
        }
      }
    });
    
    if (result.success && result.magicLink) {
      console.log(`[PasswordReset] Generated magic link for ${email}:`, {
        purpose: 'password_reset',
        expiresAt: result.expiresAt,
        redirectTo: '/auth/update-password',
        recordId: result.token?.split('.')[0]
      });
      
      // Send email with magic link using the platform's email template system
      try {
        await sendTransactionalEmail(
          'Password Reset Magic Link',
          email,
          {
            first_name: firstName,
            magic_link: result.magicLink,
            expiration_hours: '24',
            requested_from_device: requestOrigin?.userAgent || request.headers.get('user-agent') || 'unknown device'
          }
        );
        console.log(`[PasswordReset] Email sent successfully to ${email}`);
      } catch (emailError) {
        console.error('[PasswordReset] Error sending password reset email:', emailError);
        // Don't fail the request if email fails - still return success
      }
      
      // Logging is now handled by sendTransactionalEmail in the email_send_log table
      // No need for a separate auth_events_log table
      
      return Response.json({ success: true });
    }
    
    // Capture password reset failure for monitoring
    await captureAuthError(
      'password_reset_failure',
      result.error || 'Failed to generate password reset link',
      {
        code: 'PASSWORD_RESET_LINK_GENERATION_FAILED',
        status: 500,
        endpoint: '/api/auth/password-reset/request',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        originalError: result.error,
      },
      {
        url: request.url,
        component: 'PasswordResetRequestAPI',
      }
    );
    
    return Response.json({ 
      success: false, 
      error: result.error || 'Failed to generate password reset link' 
    }, { status: 500 });
  } catch (error) {
    console.error('Password reset request error:', error);
    
    // Capture unexpected password reset errors for monitoring
    await captureAuthError(
      'unknown_error',
      error instanceof Error ? error.message : 'An unexpected error occurred in password reset',
      {
        code: 'UNEXPECTED_PASSWORD_RESET_ERROR',
        status: 500,
        endpoint: '/api/auth/password-reset/request',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        originalError: error,
      },
      {
        url: request.url,
        component: 'PasswordResetRequestAPI',
      }
    );
    
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
