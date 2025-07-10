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
    const { email, password, userData } = await request.json();
    
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
    
    // Check hash status for context and logging
    const hashDetection = await detectInvalidBcryptHash(email);
    
    // FIXED: Allow both invalid hash users (migration) AND valid hash users (new account setup)
    // Valid scenarios:
    // 1. invalid_temp_hash - Users from migration with 44-character temp hashes
    // 2. valid - New users setting up their accounts (from setup-account page)
    // 3. null_hash - Edge case where user exists but has no password
    if (hashDetection.status === 'not_found') {
      console.warn(`[PasswordUpdate] User not found for email: ${email}`);
      return Response.json({ 
        success: false, 
        error: 'User account not found' 
      }, { status: 404 });
    }
    
    if (!hashDetection.userId) {
      console.error('[PasswordUpdate] No user ID found in hash detection result');
      return Response.json({ 
        success: false, 
        error: 'User ID not found' 
      }, { status: 404 });
    }
    
    console.log(`[PasswordUpdate] Updating password for user ID: ${hashDetection.userId}, hash status: ${hashDetection.status}`);
    
    const supabase = getAdminClient();
    
    // Prepare user metadata update
    const metadataUpdate: any = {
      password_set_at: new Date().toISOString(),
      password_update_method: hashDetection.status === 'invalid_temp_hash' ? 'migration_fix' : 'account_setup'
    };
    
    // Include additional user data if provided (from setup-account flow)
    if (userData) {
      if (userData.first_name) metadataUpdate.first_name = userData.first_name;
      if (userData.last_name) metadataUpdate.last_name = userData.last_name;
      if (userData.setup_flow) metadataUpdate.setup_flow = userData.setup_flow;
      if (userData.setup_completed_at) metadataUpdate.setup_completed_at = userData.setup_completed_at;
    }
    
    // Update the user's password using admin client
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      hashDetection.userId,
      { 
        password,
        user_metadata: metadataUpdate
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
            event_type: hashDetection.status === 'invalid_temp_hash' ? 'migration_password_fix' : 'new_account_password_setup',
            user_id: hashDetection.userId,
            hash_status: hashDetection.status,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      // Non-critical error, just log it
      console.error('[PasswordUpdate] Failed to log password setup:', logError);
    }
    
    console.log(`[PasswordUpdate] Password successfully updated for ${email} (status: ${hashDetection.status})`);
    
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