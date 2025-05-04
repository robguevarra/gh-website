/**
 * Admin User Management Server Actions
 * 
 * This module provides server actions for admin operations related to user management.
 * It leverages the data access layer and implements proper validation, error handling,
 * and audit logging for all operations.
 */

'use server'

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminUsersDb } from '@/lib/supabase/data-access';
import { 
  UserSearchParams, 
  ExtendedUnifiedProfile, 
  UserDetail,
  UserNote
} from '@/types/admin-types';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';

// Helper to get the current user ID from the session
async function getCurrentUserId() {
  const cookieStore = cookies();
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
function getRequestMetadata() {
  const headersList = headers();
  return {
    ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null,
    userAgent: headersList.get('user-agent') || null
  };
}

/**
 * Search users with various filtering options
 */
export async function searchUsers(params: UserSearchParams = {}) {
  try {
    const adminId = await validateAdmin();
    const { data, error } = await adminUsersDb.searchUsers(params);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Log the admin action
    await adminUsersDb.logAdminAction(
      adminId,
      'search',
      'users',
      null,
      null,
      null,
      { searchParams: params },
      ...Object.values(getRequestMetadata())
    );
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in searchUsers server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Get detailed user information
 */
export async function getUserDetail(userId: string) {
  try {
    const adminId = await validateAdmin();
    const { data, error } = await adminUsersDb.getUserDetail(userId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Log the admin action
    await adminUsersDb.logAdminAction(
      adminId,
      'view',
      'user',
      userId,
      userId,
      null,
      null,
      ...Object.values(getRequestMetadata())
    );
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getUserDetail server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Update a user profile
 */
export async function updateUserProfile(userId: string, profileData: Partial<ExtendedUnifiedProfile>) {
  try {
    const adminId = await validateAdmin();
    
    // Get current profile for audit logging
    const { data: currentProfile, error: fetchError } = await adminUsersDb.getUserById(userId);
    
    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    
    const { data, error } = await adminUsersDb.updateUserProfile(userId, profileData);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Log the admin action
    await adminUsersDb.logAdminAction(
      adminId,
      'update',
      'user',
      userId,
      userId,
      currentProfile,
      data,
      ...Object.values(getRequestMetadata())
    );
    
    // Revalidate the user detail page
    revalidatePath(`/admin/users/${userId}`);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in updateUserProfile server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Add a note to a user profile
 */
export async function addUserNote(
  userId: string, 
  noteText: string, 
  noteType: string = 'general',
  isPinned: boolean = false
) {
  try {
    const adminId = await validateAdmin();
    
    const { data, error } = await adminUsersDb.addUserNote(
      userId,
      adminId,
      noteText,
      noteType,
      isPinned
    );
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Log the admin action
    await adminUsersDb.logAdminAction(
      adminId,
      'create',
      'user_note',
      data.id,
      userId,
      null,
      data,
      ...Object.values(getRequestMetadata())
    );
    
    // Revalidate the user detail page
    revalidatePath(`/admin/users/${userId}`);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in addUserNote server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Update a user note
 */
export async function updateUserNote(
  noteId: string,
  updates: {
    note_text?: string;
    note_type?: string;
    is_pinned?: boolean;
  },
  userId: string
) {
  try {
    const adminId = await validateAdmin();
    
    const { data, error } = await adminUsersDb.updateUserNote(noteId, updates);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Log the admin action
    await adminUsersDb.logAdminAction(
      adminId,
      'update',
      'user_note',
      noteId,
      userId,
      null,
      updates,
      ...Object.values(getRequestMetadata())
    );
    
    // Revalidate the user detail page
    revalidatePath(`/admin/users/${userId}`);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in updateUserNote server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Delete a user note
 */
export async function deleteUserNote(noteId: string, userId: string) {
  try {
    const adminId = await validateAdmin();
    
    const { data, error } = await adminUsersDb.deleteUserNote(noteId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Log the admin action
    await adminUsersDb.logAdminAction(
      adminId,
      'delete',
      'user_note',
      noteId,
      userId,
      null,
      null,
      ...Object.values(getRequestMetadata())
    );
    
    // Revalidate the user detail page
    revalidatePath(`/admin/users/${userId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteUserNote server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Get admin audit log entries
 */
export async function getAdminAuditLog(
  filters: {
    adminId?: string;
    userId?: string;
    actionType?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  try {
    await validateAdmin();
    
    const { data, error } = await adminUsersDb.getAdminAuditLog(filters);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getAdminAuditLog server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Get user activity log
 */
export async function getUserActivityLog(
  userId: string,
  filters: {
    activityType?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  try {
    await validateAdmin();
    
    const { data, error } = await adminUsersDb.getUserActivityLog(userId, filters);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getUserActivityLog server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Get user purchase history
 */
export async function getUserPurchaseHistory(
  userId: string,
  filters: {
    recordType?: 'transaction' | 'shopify_order';
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  try {
    await validateAdmin();
    
    const { data, error } = await adminUsersDb.getUserPurchaseHistory(userId, filters);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getUserPurchaseHistory server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

/**
 * Get user enrollments
 */
export async function getUserEnrollments(
  userId: string,
  filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  try {
    await validateAdmin();
    
    const { data, error } = await adminUsersDb.getUserEnrollments(userId, filters);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getUserEnrollments server action:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}
