/**
 * Session Activity Logger
 * 
 * This service handles logging session-related user activities to the database.
 * It tracks session events like login, logout, refresh, timeout, etc.
 */

import { AuthErrorWithMetadata } from './auth-error-handler';
import { getBrowserClient } from '@/lib/supabase/client';

// Define the activity types that we'll log
export const SESSION_ACTIVITY_TYPES = {
  LOGIN: 'SESSION_LOGIN',
  LOGOUT: 'SESSION_LOGOUT',
  REFRESH: 'SESSION_REFRESH',
  TIMEOUT_WARNING: 'SESSION_TIMEOUT_WARNING',
  TIMEOUT: 'SESSION_TIMEOUT',
  AUTH_ERROR: 'AUTH_ERROR'
} as const;

export type SessionActivityType = typeof SESSION_ACTIVITY_TYPES[keyof typeof SESSION_ACTIVITY_TYPES];

// Interface for the metadata we'll store with session activities
export interface SessionActivityMetadata {
  duration?: number; // session duration in seconds
  lastActive?: string; // timestamp of last activity
  errorDetails?: AuthErrorWithMetadata; // for auth errors
  platform?: string; // web/mobile
  refreshMethod?: 'manual' | 'auto'; // for refreshes
  reason?: string; // reason for the activity (e.g., "inactivity", "user-initiated")
  [key: string]: any; // allow for additional metadata
}

/**
 * Log a session activity to the user_activity_log table
 */
export async function logSessionActivity({
  userId,
  activityType,
  sessionId,
  metadata = {},
  ipAddress,
  userAgent
}: {
  userId: string;
  activityType: SessionActivityType;
  sessionId?: string;
  metadata?: SessionActivityMetadata;
  ipAddress?: string;
  userAgent?: string;
}): Promise<boolean> {
  try {
    // Create a Supabase client
    const supabase = getBrowserClient();
    
    // Get session ID from current session if not provided
    if (!sessionId) {
      const { data } = await supabase.auth.getSession();
      // Access session ID safely
      sessionId = data.session?.access_token;
    }

    // Insert the activity log - with detailed error reporting
    try {
      // Convert user_id to UUID format if it's a string
      // Note: We need to handle both UUID string format and regular strings like email addresses
      let formattedUserId = userId;
      if (userId && userId.length > 0 && !userId.includes('@')) {
        // Only try to format as UUID if it's not an email address
        try {
          // Ensure UUID format - this will throw if not valid UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(userId)) {
            console.warn('User ID is not in UUID format, logging as-is:', userId);
          }
        } catch (e) {
          console.warn('Failed to validate UUID format:', e);
        }
      }
      
      const { error } = await supabase
        .from('user_activity_log')
        .insert({
          user_id: formattedUserId,
          activity_type: activityType,
          resource_type: 'session',
          resource_id: null, // Optional UUID, not using for sessions
          metadata,
          ip_address: ipAddress,
          user_agent: userAgent,
          session_id: sessionId
        });

      if (error) {
        console.error('Failed to log session activity:', error);
        // Log more detailed error information
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return false;
      }

      // If this is a login activity, update unified_profiles.last_login_at and login_count
      if (activityType === SESSION_ACTIVITY_TYPES.LOGIN) {
        await updateUserLoginProfile(formattedUserId, supabase);
      }

    } catch (insertError) {
      console.error('Exception during activity log insertion:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    // Don't let logging failures break the application
    console.error('Error logging session activity:', error);
    return false;
  }
}

/**
 * Update user's last_login_at and increment login_count in unified_profiles
 */
async function updateUserLoginProfile(userId: string, supabase: any): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // First, get current login_count or default to 0
    const { data: currentProfile } = await supabase
      .from('unified_profiles')
      .select('login_count')
      .eq('id', userId)
      .maybeSingle();
    
    const currentLoginCount = currentProfile?.login_count || 0;
    
    // Update last_login_at and increment login_count
    const { error: updateError } = await supabase
      .from('unified_profiles')
      .update({
        last_login_at: now,
        login_count: currentLoginCount + 1,
        updated_at: now
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update user login profile:', updateError);
      // Log specific error details for debugging
      console.error('Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        userId: userId
      });
    } else {
      console.log(`Successfully updated login profile for user ${userId}: login_count = ${currentLoginCount + 1}`);
    }
  } catch (error) {
    console.error('Exception while updating user login profile:', error);
  }
}

/**
 * Helper function to get client IP and user agent
 * This can be used server-side with the Request object
 */
export function getClientInfo(request?: Request): { ipAddress?: string; userAgent?: string } {
  if (!request) {
    // Client-side fallback - IP will be determined server-side
    return {
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      ipAddress: undefined
    };
  }

  // Server-side with Request object
  const ipAddress = request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') ||
    'unknown';
  
  const userAgent = request.headers.get('user-agent') || undefined;
  
  return { ipAddress: ipAddress.split(',')[0].trim(), userAgent };
}
