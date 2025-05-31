/**
 * Test utility for the session activity logger
 * This file helps debug session activity logging issues
 */

import { getBrowserClient } from '@/lib/supabase/client';
import { logSessionActivity, SESSION_ACTIVITY_TYPES } from './session-activity-logger';

/**
 * Run a direct test of the session activity logger
 * This function will attempt to log a test activity and report any errors
 */
export async function testActivityLogging(): Promise<void> {
  console.log('Running session activity logger test...');
  
  try {
    // Get current user
    const supabase = getBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user found. Please log in before testing.');
      return;
    }
    
    console.log('Current user:', user.id);
    
    // Try logging activity
    console.log('Attempting to log test activity...');
    const result = await logSessionActivity({
      userId: user.id,
      activityType: SESSION_ACTIVITY_TYPES.LOGIN,
      metadata: {
        platform: 'web',
        test: true,
        timestamp: new Date().toISOString()
      },
      userAgent: navigator.userAgent
    });
    
    console.log('Activity logging result:', result);
    
    // Try direct DB query to verify permissions
    console.log('Testing direct database query...');
    const { data, error } = await supabase
      .from('user_activity_log')
      .select('id, created_at')
      .limit(5);
    
    if (error) {
      console.error('Error querying user_activity_log:', error);
    } else {
      console.log('Query successful:', data);
    }
    
    // Try direct insert with UUID handling
    console.log('Testing direct insert...');
    const { error: insertError } = await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        activity_type: 'TEST_ACTIVITY',
        resource_type: 'session',
        metadata: { test: true, direct: true },
        user_agent: navigator.userAgent
      });
    
    if (insertError) {
      console.error('Direct insert error:', insertError);
    } else {
      console.log('Direct insert successful!');
    }
    
  } catch (error) {
    console.error('Test failed with exception:', error);
  }
}

/**
 * Add this function to the window object so it can be called from the console
 * Usage: window.testSessionLogger()
 */
if (typeof window !== 'undefined') {
  (window as any).testSessionLogger = testActivityLogging;
}
