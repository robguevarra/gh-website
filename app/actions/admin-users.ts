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
import * as adminUsersDb from '@/lib/supabase/data-access/admin-users';
import { 
  UserSearchParams, 
  ExtendedUnifiedProfile, 
  UserDetail,
  UserNote
} from '@/types/admin-types';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
export async function validateAdmin() {
  // Use the createServerSupabaseClient helper which properly handles cookies
  const supabase = await createServerSupabaseClient();
  
  // Use getUser() instead of getSession() for secure authentication
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  // Check unified_profiles table first (modern approach)
  const { data: unifiedProfile } = await supabase
    .from('unified_profiles')
    .select('is_admin, status, tags')
    .eq('id', user.id)
    .single();
  
  // Check if user is admin via unified_profiles
  if (unifiedProfile) {
    const isAdminByFlag = unifiedProfile.is_admin === true;
    const isAdminByTag = unifiedProfile.tags && Array.isArray(unifiedProfile.tags) && unifiedProfile.tags.includes('admin');
    const isActive = unifiedProfile.status === 'active';
    
    if ((isAdminByFlag || isAdminByTag) && isActive) {
      return user.id;
    }
  }
  
  // Fallback to profiles table for legacy compatibility
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single();
  
  const isAdmin = profile?.role === 'admin' || profile?.is_admin === true;
  
  return isAdmin ? user.id : null;
}

// Helper to get request metadata
async function getRequestMetadata() {
  const headersList = await headers();
  return {
    ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown',
    userAgent: headersList.get('user-agent') || 'unknown',
  };
}

/**
 * Search users with various filtering options
 */
export async function searchUsers(params: UserSearchParams = {}) {
  try {
    const adminId = await validateAdmin();
    if (!adminId) {
      return { success: false, error: 'Unauthorized access. Admin privileges required.' };
    }
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
    if (!adminId) {
      return { success: false, error: 'Unauthorized access. Admin privileges required.' };
    }
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
 * Update a user profile with comprehensive validation, error handling, and audit logging
 */
export async function updateUserProfile(userId: string, profileData: Partial<ExtendedUnifiedProfile>) {
  try {
    // Validate admin access
    const adminId = await validateAdmin();
    if (!adminId) {
      return { success: false, error: 'Unauthorized access. Admin privileges required.' };
    }
    
    // Validate user ID
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    
    // Get current profile for audit logging and validation
    const { data: currentProfile, error: fetchError } = await adminUsersDb.getUserById(userId);
    
    if (fetchError || !currentProfile) {
      return { success: false, error: fetchError?.message || 'User not found' };
    }
    
    // Validate profile data
    if (Object.keys(profileData).length === 0) {
      return { success: false, error: 'No profile data provided for update' };
    }
    
    // Prepare metadata for logging
    const requestMetadata = await getRequestMetadata();
    
    // Track sensitive changes for enhanced logging
    const sensitiveChanges = [];
    if (profileData.status && profileData.status !== currentProfile.status) {
      sensitiveChanges.push({
        field: 'status',
        from: currentProfile.status,
        to: profileData.status
      });
    }
    
    // Update the user profile
    const { data, error } = await adminUsersDb.updateUserProfile(userId, profileData);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Prepare detailed audit log entry
    const auditMetadata = {
      changes: Object.keys(profileData).map(key => ({
        field: key,
        from: currentProfile[key as keyof typeof currentProfile],
        to: profileData[key as keyof typeof profileData]
      })),
      sensitiveChanges,
      requestInfo: requestMetadata
    };
    
    // Log the admin action with detailed metadata
    await adminUsersDb.logAdminAction(
      adminId,
      'update',
      'user',
      userId,
      userId,
      currentProfile,
      data,
      requestMetadata.ipAddress,
      requestMetadata.userAgent,
      auditMetadata
    );
    
    // Revalidate all relevant paths
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath('/admin/users');
    
    return { 
      success: true, 
      data,
      message: 'User profile updated successfully',
      sensitiveChanges: sensitiveChanges.length > 0 ? sensitiveChanges : undefined
    };
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
