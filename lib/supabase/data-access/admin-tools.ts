/**
 * Admin Tools Data Access Layer
 * 
 * This module provides data access functions for administrative operations such as
 * password reset, account status management, and permission updates.
 * All functions include proper error handling and audit logging.
 */

import { createServerSupabaseClient } from '../client';
import { getAdminClient } from '../admin';
import { withPerformanceMonitoring } from '@/lib/utils/performance';

/**
 * Error handling wrapper for data access functions
 */
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage = 'Admin operation failed'
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await operation();
    return { data: result, error: null };
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Log an administrative action to the audit log
 */
async function logAdminAction({
  adminId,
  userId,
  action,
  details,
  metadata,
}: {
  adminId: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  metadata: {
    userAgent: string;
    ip: string;
    timestamp: string;
  };
}) {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from('admin_audit_log')
    .insert({
      admin_id: adminId,
      user_id: userId,
      action,
      details,
      ip_address: metadata.ip,
      user_agent: metadata.userAgent,
      created_at: metadata.timestamp,
    });
  
  if (error) {
    console.error('Error logging admin action:', error);
  }
}

/**
 * Reset a user's password
 */
export async function resetUserPassword({
  userId,
  adminId,
  sendEmail,
  metadata,
}: {
  userId: string;
  adminId: string;
  sendEmail: boolean;
  metadata: {
    userAgent: string;
    ip: string;
    timestamp: string;
  };
}) {
  return withErrorHandling(async () => {
    return await withPerformanceMonitoring(async () => {
      // Get the admin client for auth operations
      const adminAuth = await getAdminClient();
      
      // Generate a password reset link
      const { data, error } = await adminAuth.auth.admin.generateLink({
        type: 'recovery',
        email: '', // We'll fetch the email below
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
        },
      });
      
      if (error) {
        throw new Error(`Failed to generate password reset link: ${error.message}`);
      }
      
      // Get the user's email
      const supabase = createServerSupabaseClient();
      const { data: userData, error: userError } = await supabase
        .from('unified_profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        throw new Error(`Failed to get user email: ${userError?.message || 'User not found'}`);
      }
      
      // If sendEmail is true, send the password reset email
      if (sendEmail) {
        // In a real implementation, you would send an email with the reset link
        // For now, we'll just log it
        console.log(`Password reset link for ${userData.email}: ${data.properties.action_link}`);
        
        // TODO: Implement email sending logic
        // await sendEmail({
        //   to: userData.email,
        //   subject: 'Password Reset',
        //   body: `Click this link to reset your password: ${data.properties.action_link}`,
        // });
      }
      
      // Log the admin action
      await logAdminAction({
        adminId,
        userId,
        action: 'password_reset',
        details: {
          email: userData.email,
          sent_email: sendEmail,
        },
        metadata,
      });
      
      return { success: true };
    }, 'admin_reset_password');
  }, 'Failed to reset user password');
}

/**
 * Update a user's account status
 */
export async function updateUserStatus({
  userId,
  adminId,
  status,
  reason,
  sendNotification,
  metadata,
}: {
  userId: string;
  adminId: string;
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  reason: string;
  sendNotification: boolean;
  metadata: {
    userAgent: string;
    ip: string;
    timestamp: string;
  };
}) {
  return withErrorHandling(async () => {
    return await withPerformanceMonitoring(async () => {
      const supabase = createServerSupabaseClient();
      
      // Get the current status for audit logging
      const { data: userData, error: userError } = await supabase
        .from('unified_profiles')
        .select('status, email')
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        throw new Error(`Failed to get user data: ${userError?.message || 'User not found'}`);
      }
      
      // Update the user's status
      const { error } = await supabase
        .from('unified_profiles')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      
      if (error) {
        throw new Error(`Failed to update user status: ${error.message}`);
      }
      
      // If the status is 'banned' or 'suspended', we might want to also disable their auth account
      if (status === 'banned' || status === 'suspended') {
        const adminAuth = await getAdminClient();
        
        // Disable the user's auth account
        const { error: authError } = await adminAuth.auth.admin.updateUserById(
          userId,
          { ban_duration: status === 'banned' ? 'forever' : '7d' }
        );
        
        if (authError) {
          console.error(`Failed to update auth status: ${authError.message}`);
          // We'll continue even if this fails
        }
      } else if (status === 'active') {
        // If the status is being set to active, ensure the auth account is enabled
        const adminAuth = await getAdminClient();
        
        // Enable the user's auth account
        const { error: authError } = await adminAuth.auth.admin.updateUserById(
          userId,
          { ban_duration: null }
        );
        
        if (authError) {
          console.error(`Failed to update auth status: ${authError.message}`);
          // We'll continue even if this fails
        }
      }
      
      // If sendNotification is true, send a notification to the user
      if (sendNotification) {
        // TODO: Implement notification sending logic
        console.log(`Status change notification for ${userData.email}: Status changed to ${status}`);
        
        // await sendEmail({
        //   to: userData.email,
        //   subject: 'Account Status Update',
        //   body: `Your account status has been updated to ${status}. Reason: ${reason}`,
        // });
      }
      
      // Log the admin action
      await logAdminAction({
        adminId,
        userId,
        action: 'status_update',
        details: {
          previous_status: userData.status,
          new_status: status,
          reason,
          sent_notification: sendNotification,
        },
        metadata,
      });
      
      return { success: true };
    }, 'admin_update_status');
  }, 'Failed to update user status');
}

/**
 * Update a user's permissions
 */
export async function updateUserPermissions({
  userId,
  adminId,
  permissions,
  metadata,
}: {
  userId: string;
  adminId: string;
  permissions: {
    canAccessPremiumContent: boolean;
    canAccessBetaFeatures: boolean;
    canPostComments: boolean;
    canSubmitContent: boolean;
    maxConcurrentLogins: number;
    customPermissions?: string;
  };
  metadata: {
    userAgent: string;
    ip: string;
    timestamp: string;
  };
}) {
  return withErrorHandling(async () => {
    return await withPerformanceMonitoring(async () => {
      const supabase = createServerSupabaseClient();
      
      // Get the current permissions for audit logging
      const { data: userData, error: userError } = await supabase
        .from('unified_profiles')
        .select('permissions, email')
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        throw new Error(`Failed to get user data: ${userError?.message || 'User not found'}`);
      }
      
      // Parse custom permissions if provided
      let customPermissionsObj = {};
      if (permissions.customPermissions) {
        try {
          customPermissionsObj = JSON.parse(permissions.customPermissions);
        } catch (e) {
          throw new Error('Invalid JSON in custom permissions');
        }
      }
      
      // Prepare the permissions object to store in the database
      const permissionsObj = {
        canAccessPremiumContent: permissions.canAccessPremiumContent,
        canAccessBetaFeatures: permissions.canAccessBetaFeatures,
        canPostComments: permissions.canPostComments,
        canSubmitContent: permissions.canSubmitContent,
        maxConcurrentLogins: permissions.maxConcurrentLogins,
        ...customPermissionsObj,
      };
      
      // Update the user's permissions
      const { error } = await supabase
        .from('unified_profiles')
        .update({
          permissions: permissionsObj,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      
      if (error) {
        throw new Error(`Failed to update user permissions: ${error.message}`);
      }
      
      // Log the admin action
      await logAdminAction({
        adminId,
        userId,
        action: 'permissions_update',
        details: {
          previous_permissions: userData.permissions || {},
          new_permissions: permissionsObj,
        },
        metadata,
      });
      
      return { success: true };
    }, 'admin_update_permissions');
  }, 'Failed to update user permissions');
}

/**
 * Send an administrative notification to a user
 */
export async function sendAdminNotification({
  userId,
  adminId,
  subject,
  message,
  notificationType,
  priority,
  metadata,
}: {
  userId: string;
  adminId: string;
  subject: string;
  message: string;
  notificationType: 'email' | 'in_app' | 'both';
  priority: 'low' | 'normal' | 'high';
  metadata: {
    userAgent: string;
    ip: string;
    timestamp: string;
  };
}) {
  return withErrorHandling(async () => {
    return await withPerformanceMonitoring(async () => {
      const supabase = createServerSupabaseClient();
      
      // Get the user's email
      const { data: userData, error: userError } = await supabase
        .from('unified_profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        throw new Error(`Failed to get user email: ${userError?.message || 'User not found'}`);
      }
      
      // Store the notification in the database
      const { error: notificationError } = await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          admin_id: adminId,
          subject,
          message,
          priority,
          type: notificationType,
          created_at: new Date().toISOString(),
          is_read: false,
        });
      
      if (notificationError) {
        throw new Error(`Failed to create notification: ${notificationError.message}`);
      }
      
      // Send email notification if requested
      if (notificationType === 'email' || notificationType === 'both') {
        // TODO: Implement email sending logic
        console.log(`Admin notification email for ${userData.email}: ${subject}`);
        
        // await sendEmail({
        //   to: userData.email,
        //   subject,
        //   body: message,
        // });
      }
      
      // Log the admin action
      await logAdminAction({
        adminId,
        userId,
        action: 'send_notification',
        details: {
          subject,
          notification_type: notificationType,
          priority,
        },
        metadata,
      });
      
      return { success: true };
    }, 'admin_send_notification');
  }, 'Failed to send admin notification');
}
