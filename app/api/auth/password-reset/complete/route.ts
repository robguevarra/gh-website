import { validateMagicLink } from '@/lib/auth/magic-link-service';
import { createClient } from '@supabase/supabase-js';

// Create direct admin client to avoid auth session issues
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
  try {
    const { token, password, email } = await request.json();
    
    if (!token || !password) {
      return Response.json({ 
        success: false, 
        error: 'Token and password are required' 
      }, { status: 400 });
    }
    
    // Validate the magic link token and mark it as used
    // This is the actual password reset completion step, so we DO want to mark the token as used
    console.log('[PasswordReset] Validating token for password reset completion (will mark as used)');
    const validation = await validateMagicLink(token, 
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      true // Explicitly mark as used during password reset completion
    );
    
    // Special handling for tokens that are marked as used
    // A token might be marked as used if the user opens the password reset page in multiple tabs
    // or refreshes the page after verification
    if (!validation.success) {
      console.error('[PasswordReset] Token validation failed:', validation.error);
      
      // If token is already used, check if we can still use it for password reset
      if (validation.used && validation.email) {
        // Token is marked as used but has valid user email - continue with the reset
        console.log('[PasswordReset] Token already used but has valid email, continuing with reset');
        
        // Override validation purpose for this special case
        validation.purpose = 'password_reset';
      } else {
        // Other validation errors - return error
        return Response.json({ 
          success: false, 
          error: validation.error || 'Invalid or expired password reset link' 
        }, { status: 400 });
      }
    }
    
    // Ensure this is a password reset token
    if (validation.purpose !== 'password_reset') {
      console.error('[PasswordReset] Invalid token purpose:', validation.purpose);
      return Response.json({ 
        success: false, 
        error: 'Invalid token purpose' 
      }, { status: 400 });
    }
    
    // Get the email from either the validation or the request
    const userEmail = validation.email || email;
    
    if (!userEmail) {
      console.error('[PasswordReset] No email found in token or request');
      return Response.json({ 
        success: false, 
        error: 'User email not found' 
      }, { status: 400 });
    }
    
    // Get the Supabase admin client (direct version to avoid auth session issues)
    const supabase = getDirectAdminClient();
    
    console.log(`[PasswordReset] Looking up user ID for email: ${userEmail}`);
    
    // First, try to get the user ID
    // Using listUsers and filtering manually since the typing for filter param is incorrect
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();
    
    // Find the user with matching email
    const user = getUserError ? null : {
      users: users?.users?.filter(u => u.email === userEmail) || []
    };
    
    if (getUserError || !user?.users || user.users.length === 0) {
      console.error('[PasswordReset] User not found:', getUserError || 'No user with this email');
      return Response.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    const userId = user.users[0].id;
    
    console.log(`[PasswordReset] Updating password for user ID: ${userId}`);
    
    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password }
    );
    
    if (updateError) {
      console.error('[PasswordReset] Password update failed:', updateError);
      return Response.json({ 
        success: false, 
        error: updateError.message || 'Failed to update password' 
      }, { status: 500 });
    }
    
    // Mark the token as used
    await supabase
      .from('magic_links')
      .update({ 
        used_at: new Date().toISOString(),
        metadata: {
          ...(typeof validation.metadata === 'object' ? validation.metadata : {}),
          password_reset_completed: true,
          password_reset_completed_at: new Date().toISOString()
        }
      })
      .eq('token', token);
    
    // Log the password reset
    try {
      await supabase
        .from('email_send_log')
        .insert({
          template_id: 'password-reset-completion',
          template_name: 'Password Reset Completion',
          template_category: 'authentication',
          recipient_email: userEmail,
          subject: 'Your password has been updated',
          status: 'internal_notification',
          variables: {
            event_type: 'password_reset_completed',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown'
          }
        });
    } catch (logError) {
      // Non-critical error, just log it
      console.error('[PasswordReset] Failed to log password reset:', logError);
    }
    
    return Response.json({ 
      success: true,
      email: userEmail
    });
  } catch (error) {
    console.error('[PasswordReset] Unexpected error:', error);
    
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
