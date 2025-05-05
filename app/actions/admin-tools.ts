/**
 * Admin Tools Server Actions
 * 
 * This module provides server actions for administrative operations such as
 * password reset, account status management, and permission updates.
 * All actions include proper validation, error handling, and audit logging.
 */

'use server'

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import * as adminUsersDb from '@/lib/supabase/data-access/admin-users';
import * as adminToolsDb from '@/lib/supabase/data-access/admin-tools';
import { createServerClient } from '@supabase/ssr';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { z } from 'zod';

// Helper to get the current user ID from the session
async function getCurrentUserId() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
}

// Helper to validate admin access
async function validateAdmin() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  
  const isAdmin = await validateAdminStatus(userId);
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
  
  return userId;
}

// Helper to get request metadata
async function getRequestMetadata() {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || 'Unknown';
  const ip = headersList.get('x-forwarded-for') || 
             headersList.get('x-real-ip') || 
             'Unknown';
  
  return {
    userAgent,
    ip,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset a user's password
 */
export async function resetUserPassword(data: {
  userId: string;
  adminId?: string; // Optional, will be filled from session if not provided
  sendEmail: boolean;
}) {
  try {
    // Validate admin access and get admin ID
    const adminId = data.adminId || await validateAdmin();
    
    // Get request metadata for audit logging
    const metadata = await getRequestMetadata();
    
    // Call the data access function to reset password
    const result = await adminToolsDb.resetUserPassword({
      userId: data.userId,
      adminId,
      sendEmail: data.sendEmail,
      metadata,
    });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    
    // Revalidate the user detail page
    revalidatePath(`/admin/users/${data.userId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error resetting user password:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Update a user's account status
 */
export async function updateUserStatus(data: {
  userId: string;
  adminId?: string; // Optional, will be filled from session if not provided
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  reason: string;
  sendNotification: boolean;
}) {
  try {
    // Validate the input
    const schema = z.object({
      userId: z.string().uuid(),
      status: z.enum(['active', 'inactive', 'suspended', 'banned']),
      reason: z.string().min(5),
      sendNotification: z.boolean(),
    });
    
    schema.parse(data);
    
    // Validate admin access and get admin ID
    const adminId = data.adminId || await validateAdmin();
    
    // Get request metadata for audit logging
    const metadata = await getRequestMetadata();
    
    // Call the data access function to update status
    const result = await adminToolsDb.updateUserStatus({
      userId: data.userId,
      adminId,
      status: data.status,
      reason: data.reason,
      sendNotification: data.sendNotification,
      metadata,
    });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    
    // Revalidate the user detail page
    revalidatePath(`/admin/users/${data.userId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Update a user's permissions
 */
export async function updateUserPermissions(data: {
  userId: string;
  adminId?: string; // Optional, will be filled from session if not provided
  permissions: {
    canAccessPremiumContent: boolean;
    canAccessBetaFeatures: boolean;
    canPostComments: boolean;
    canSubmitContent: boolean;
    maxConcurrentLogins: number;
    customPermissions?: string;
  };
}) {
  try {
    // Validate the input
    const schema = z.object({
      userId: z.string().uuid(),
      permissions: z.object({
        canAccessPremiumContent: z.boolean(),
        canAccessBetaFeatures: z.boolean(),
        canPostComments: z.boolean(),
        canSubmitContent: z.boolean(),
        maxConcurrentLogins: z.number().int().min(1).max(10),
        customPermissions: z.string().optional(),
      }),
    });
    
    schema.parse(data);
    
    // Validate admin access and get admin ID
    const adminId = data.adminId || await validateAdmin();
    
    // Get request metadata for audit logging
    const metadata = await getRequestMetadata();
    
    // Call the data access function to update permissions
    const result = await adminToolsDb.updateUserPermissions({
      userId: data.userId,
      adminId,
      permissions: data.permissions,
      metadata,
    });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    
    // Revalidate the user detail page
    revalidatePath(`/admin/users/${data.userId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Send an administrative notification to a user
 */
export async function sendAdminNotification(data: {
  userId: string;
  adminId?: string; // Optional, will be filled from session if not provided
  subject: string;
  message: string;
  notificationType: 'email' | 'in_app' | 'both';
  priority: 'low' | 'normal' | 'high';
}) {
  try {
    // Validate the input
    const schema = z.object({
      userId: z.string().uuid(),
      subject: z.string().min(3),
      message: z.string().min(10),
      notificationType: z.enum(['email', 'in_app', 'both']),
      priority: z.enum(['low', 'normal', 'high']),
    });
    
    schema.parse(data);
    
    // Validate admin access and get admin ID
    const adminId = data.adminId || await validateAdmin();
    
    // Get request metadata for audit logging
    const metadata = await getRequestMetadata();
    
    // Call the data access function to send notification
    const result = await adminToolsDb.sendAdminNotification({
      userId: data.userId,
      adminId,
      subject: data.subject,
      message: data.message,
      notificationType: data.notificationType,
      priority: data.priority,
      metadata,
    });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}
