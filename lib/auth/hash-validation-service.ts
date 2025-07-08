import { createClient } from '@supabase/supabase-js';

// Admin client for hash validation
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for hash validation');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export type HashDetectionResult = {
  status: 'valid' | 'invalid_temp_hash' | 'null_hash' | 'not_found';
  email?: string;
  userId?: string;
  details?: string;
};

/**
 * Detects if a user has an invalid bcrypt hash from the clean migration
 * Users from clean_migration have 44-character temporary hashes instead of 60-character bcrypt hashes
 */
export async function detectInvalidBcryptHash(email: string): Promise<HashDetectionResult> {
  try {
    const supabase = getAdminClient();
    const normalizedEmail = email.toLowerCase();
    
    console.log(`[HashDetection] Checking hash status for: ${normalizedEmail}`);
    
    // First, get the user profile to get the user ID
    const { data: profile, error: profileError } = await supabase
      .from('unified_profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (profileError) {
      console.error('[HashDetection] Error fetching profile:', profileError);
      return { 
        status: 'not_found', 
        details: `Profile lookup failed: ${profileError.message}` 
      };
    }
    
    if (!profile) {
      console.log('[HashDetection] No profile found for email');
      return { 
        status: 'not_found', 
        details: 'No profile found for email' 
      };
    }
    
    // Get the encrypted password hash directly from auth.users table
    const { data: hashData, error: hashError } = await supabase
      .from('auth.users')
      .select('encrypted_password')
      .eq('id', profile.id)
      .single();
    
    if (hashError) {
      console.error('[HashDetection] Error fetching password hash:', hashError);
      return { 
        status: 'not_found', 
        details: `Hash lookup failed: ${hashError.message}` 
      };
    }
    
    const encryptedPassword = hashData?.encrypted_password;
    
    if (!encryptedPassword) {
      console.log('[HashDetection] NULL hash detected');
      await logHashDetection(normalizedEmail, 'null_hash', 'NULL encrypted_password');
      
      return {
        status: 'null_hash',
        email: normalizedEmail,
        userId: profile.id,
        details: 'NULL encrypted_password'
      };
    }
    
    // Check hash length - valid bcrypt hashes are 60 characters, temp hashes are 44
    const hashLength = encryptedPassword.length;
    console.log(`[HashDetection] Hash length: ${hashLength} characters`);
    
    if (hashLength === 44) {
      console.log('[HashDetection] Invalid 44-character hash detected (temp migration hash)');
      await logHashDetection(normalizedEmail, 'invalid_temp_hash', `44-character hash: ${encryptedPassword.substring(0, 20)}...`);
      
      return {
        status: 'invalid_temp_hash',
        email: normalizedEmail,
        userId: profile.id,
        details: `44-character temporary hash detected`
      };
    }
    
    if (hashLength === 60) {
      console.log('[HashDetection] Valid 60-character bcrypt hash detected');
      await logHashDetection(normalizedEmail, 'valid', `60-character bcrypt hash: ${encryptedPassword.substring(0, 20)}...`);
      
      return {
        status: 'valid',
        email: normalizedEmail,
        userId: profile.id,
        details: 'Valid 60-character bcrypt hash'
      };
    }
    
    // Unexpected hash length
    console.log(`[HashDetection] Unexpected hash length: ${hashLength}`);
    await logHashDetection(normalizedEmail, 'invalid_temp_hash', `Unexpected hash length: ${hashLength}`);
    
    return {
      status: 'invalid_temp_hash',
      email: normalizedEmail,
      userId: profile.id,
      details: `Unexpected hash length: ${hashLength}`
    };
    
  } catch (error) {
    console.error('[HashDetection] Exception during hash detection:', error);
    await logHashDetection(email, 'error', `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      status: 'not_found',
      details: `Exception during detection: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Logs hash detection events for monitoring and analysis
 */
async function logHashDetection(email: string, status: string, details: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    
    // Hash the email for privacy in logs
    const crypto = require('crypto');
    const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
    
    await supabase
      .from('email_send_log')
      .insert({
        template_id: 'hash-detection-log',
        template_name: 'Hash Detection Event',
        template_category: 'security',
        recipient_email: hashedEmail, // Store hashed email for privacy
        subject: `Hash Detection: ${status}`,
        status: 'internal_notification',
        variables: {
          detection_status: status,
          details: details,
          timestamp: new Date().toISOString()
        }
      });
      
  } catch (logError) {
    console.error('[HashDetection] Failed to log detection event:', logError);
    // Don't throw - logging is non-critical
  }
} 