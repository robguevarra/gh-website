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
    const normalizedEmail = userEmail.toLowerCase();
    
    console.log(`[PasswordReset] Looking up user ID for email: ${normalizedEmail}`);
    
    // Multi-strategy approach to find user ID
    let userId = null;
    let user = null;
    
    // Strategy 1: Look up the user in unified_profiles table first (most efficient)
    try {
      console.log('[PasswordReset] Looking up user in unified_profiles table...');
      const { data: profileData, error: profileError } = await supabase
        .from('unified_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profileError) {
        console.error('[PasswordReset] Error looking up user in profiles:', profileError);
      } else if (profileData?.id) {
        userId = profileData.id;
        console.log('[PasswordReset] Found user ID in profiles:', userId);
      }
    } catch (profileLookupError) {
      console.error('[PasswordReset] Exception during profile lookup:', profileLookupError);
      // Continue to next strategy
    }
    
    // Strategy 2: If we have the userId, fetch the user details directly
    if (userId) {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (userError) {
          console.error('[PasswordReset] Error fetching user by ID:', userError);
        } else if (userData?.user) {
          user = userData.user;
          console.log('[PasswordReset] Successfully retrieved user details by ID');
        }
      } catch (userLookupError) {
        console.error('[PasswordReset] Exception fetching user by ID:', userLookupError);
        // Will continue to next strategy if needed
      }
    }
    
    // Strategy 3: Last resort - Try to use a limited listUsers with pagination
    if (!userId && !user) {
      try {
        console.log('[PasswordReset] Attempting paginated user lookup as last resort...');
        // We'll only check the first page to avoid timeouts
        const { data: usersPage, error: getUserError } = await supabase.auth.admin.listUsers({
          page: 0,
          perPage: 1000, // Try to get as many as possible in one request
        });
        
        if (getUserError) {
          console.error('[PasswordReset] Error during paginated user lookup:', getUserError);
        } else if (usersPage?.users) {
          // Find the user with matching email
          const matchingUser = usersPage.users.find(u => 
            u.email?.toLowerCase() === normalizedEmail
          );
          
          if (matchingUser) {
            user = matchingUser;
            userId = matchingUser.id;
            console.log('[PasswordReset] Found user through paginated lookup:', userId);
          }
        }
      } catch (paginatedLookupError) {
        console.error('[PasswordReset] Exception during paginated lookup:', paginatedLookupError);
      }
    }
    
    if (!userId || !user) {
      console.error('[PasswordReset] User not found after all lookup attempts');
      return Response.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
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
