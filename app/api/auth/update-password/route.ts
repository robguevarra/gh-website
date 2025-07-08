import { createClient } from '@supabase/supabase-js';
import { detectInvalidBcryptHash } from '@/lib/auth/hash-validation-service';

// Admin client for password updates
function getAdminClient() {
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
  console.log('[PasswordUpdate] Processing direct password update request');
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return Response.json({ 
        success: false, 
        error: 'Email and password are required' 
      }, { status: 400 });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return Response.json({ 
        success: false, 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }
    
    console.log(`[PasswordUpdate] Validating hash status for: ${email}`);
    
    // Double validation: Ensure user actually has invalid hash
    const hashDetection = await detectInvalidBcryptHash(email);
    
    if (hashDetection.status !== 'invalid_temp_hash') {
      console.warn(`[PasswordUpdate] Unauthorized direct update attempt for ${email}, hash status: ${hashDetection.status}`);
      return Response.json({ 
        success: false, 
        error: 'Direct password update not allowed for this account' 
      }, { status: 403 });
    }
    
    if (!hashDetection.userId) {
      console.error('[PasswordUpdate] No user ID found in hash detection result');
      return Response.json({ 
        success: false, 
        error: 'User ID not found' 
      }, { status: 404 });
    }
    
    console.log(`[PasswordUpdate] Updating password for user ID: ${hashDetection.userId}`);
    
    const supabase = getAdminClient();
    
    // Update the user's password using admin client
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      hashDetection.userId,
      { 
        password,
        user_metadata: {
          password_set_at: new Date().toISOString(),
          password_update_method: 'direct_setup'
        }
      }
    );
    
    if (updateError) {
      console.error('[PasswordUpdate] Password update failed:', updateError);
      return Response.json({ 
        success: false, 
        error: updateError.message || 'Failed to update password' 
      }, { status: 500 });
    }
    
    // Verify the password was actually updated by checking hash length
    const { data: verifyUser, error: verifyError } = await supabase.auth.admin.getUserById(hashDetection.userId);
    
    if (verifyError) {
      console.error('[PasswordUpdate] Verification failed:', verifyError);
    } else {
      console.log('[PasswordUpdate] Password update verified successfully');
    }
    
    // Log the successful password setup
    try {
      await supabase
        .from('email_send_log')
        .insert({
          template_id: 'password-setup-completion',
          template_name: 'Password Setup Completion',
          template_category: 'authentication',
          recipient_email: email.toLowerCase(),
          subject: 'Password setup completed successfully',
          status: 'internal_notification',
          variables: {
            event_type: 'direct_password_setup_completed',
            user_id: hashDetection.userId,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      // Non-critical error, just log it
      console.error('[PasswordUpdate] Failed to log password setup:', logError);
    }
    
    console.log(`[PasswordUpdate] Password successfully updated for ${email}`);
    
    return Response.json({ 
      success: true,
      email: email.toLowerCase(),
      message: 'Your password has been created successfully'
    });
  } catch (error) {
    console.error('[PasswordUpdate] Unexpected error:', error);
    
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 });
  }
} 