/**
 * Admin User Management Data Access Layer
 * 
 * This module provides server-side functions for admin operations related to user management.
 * It includes functions for user searching, profile retrieval, audit logging, and user updates.
 * 
 * All functions use proper error handling and are optimized for performance.
 */

import { createServerSupabaseClient } from '../client';
import { getAdminClient } from '../admin';
import { 
  UserSearchParams, 
  ExtendedUnifiedProfile, 
  UserDetail,
  AuditLogEntry,
  UserNote,
  UserActivityLogEntry,
  UserPurchaseHistoryItem
} from '@/types/admin-types';

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
 * Search users with various filtering options
 * Uses the database function search_users for efficient querying
 */
export async function searchUsers(params: UserSearchParams = {}) {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase.rpc('search_users', {
      p_search_term: params.searchTerm || null,
      p_status: params.status || null,
      p_tags: params.tags || null,
      p_acquisition_source: params.acquisitionSource || null,
      p_created_after: params.createdAfter ? new Date(params.createdAfter).toISOString() : null,
      p_created_before: params.createdBefore ? new Date(params.createdBefore).toISOString() : null,
      p_has_transactions: params.hasTransactions !== undefined ? params.hasTransactions : null,
      p_has_enrollments: params.hasEnrollments !== undefined ? params.hasEnrollments : null,
      p_limit: params.limit || 50,
      p_offset: params.offset || 0
    });
    
    if (error) throw error;
    return data as ExtendedUnifiedProfile[];
  }, 'Failed to search users');
}

/**
 * Get a user by ID with complete profile information
 */
export async function getUserById(userId: string) {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('unified_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data as ExtendedUnifiedProfile;
  }, 'Failed to get user by ID');
}

/**
 * Get detailed user information including related data
 * This function aggregates data from multiple tables for a comprehensive user view
 */
export async function getUserDetail(userId: string): Promise<{ data: UserDetail | null; error: Error | null }> {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('unified_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    // Get user notes
    const { data: notes, error: notesError } = await supabase
      .from('user_notes')
      .select(`
        *,
        admin:admin_id(
          email,
          first_name,
          last_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (notesError) throw notesError;
    
    // Get recent user activity
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (activitiesError) throw activitiesError;
    
    // Get purchase history
    const { data: purchases, error: purchasesError } = await supabase
      .from('user_purchase_history_view')
      .select('*')
      .eq('user_id', userId)
      .order('purchase_date', { ascending: false });
    
    if (purchasesError) throw purchasesError;
    
    // Get enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:course_id(
          id,
          title,
          slug,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });
    
    if (enrollmentsError) throw enrollmentsError;
    
    return {
      ...profile as ExtendedUnifiedProfile,
      notes: notes as UserNote[],
      activities: activities as UserActivityLogEntry[],
      purchases: purchases as UserPurchaseHistoryItem[],
      enrollments
    } as UserDetail;
  }, 'Failed to get user detail');
}

/**
 * Update a user profile
 */
export async function updateUserProfile(userId: string, profileData: Partial<ExtendedUnifiedProfile>) {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    // Get current profile state for audit logging
    const { data: currentProfile, error: fetchError } = await supabase
      .from('unified_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Update the profile
    const { data, error } = await supabase
      .from('unified_profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }, 'Failed to update user profile');
}

/**
 * Add a note to a user profile
 */
export async function addUserNote(
  userId: string, 
  adminId: string, 
  noteText: string, 
  noteType: string = 'general',
  isPinned: boolean = false
) {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_notes')
      .insert({
        user_id: userId,
        admin_id: adminId,
        note_text: noteText,
        note_type: noteType,
        is_pinned: isPinned,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        admin:admin_id(
          email,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) throw error;
    return data as UserNote;
  }, 'Failed to add user note');
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
  }
) {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select(`
        *,
        admin:admin_id(
          email,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) throw error;
    return data as UserNote;
  }, 'Failed to update user note');
}

/**
 * Delete a user note
 */
export async function deleteUserNote(noteId: string) {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId);
    
    if (error) throw error;
    return true;
  }, 'Failed to delete user note');
}

/**
 * Log an admin action
 */
export async function logAdminAction(
  adminId: string,
  actionType: string,
  entityType: string,
  entityId: string | null = null,
  userId: string | null = null,
  previousState: any = null,
  newState: any = null,
  ipAddress: string | null = null,
  userAgent: string | null = null
) {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    // Use the database function for consistent logging
    const { data, error } = await supabase.rpc('log_admin_action', {
      p_admin_id: adminId,
      p_user_id: userId,
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_previous_state: previousState,
      p_new_state: newState,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });
    
    if (error) throw error;
    return data;
  }, 'Failed to log admin action');
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
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_id(
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (filters.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.actionType) {
      query = query.eq('action_type', filters.actionType);
    }
    
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', new Date(filters.startDate).toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', new Date(filters.endDate).toISOString());
    }
    
    query = query.limit(filters.limit || 50).range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 50) - 1
    );
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as AuditLogEntry[];
  }, 'Failed to get admin audit log');
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
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('user_activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (filters.activityType) {
      query = query.eq('activity_type', filters.activityType);
    }
    
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', new Date(filters.startDate).toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', new Date(filters.endDate).toISOString());
    }
    
    query = query.limit(filters.limit || 50).range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 50) - 1
    );
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as UserActivityLogEntry[];
  }, 'Failed to get user activity log');
}

/**
 * Log user activity
 */
export async function logUserActivity(
  userId: string,
  activityType: string,
  resourceType: string | null = null,
  resourceId: string | null = null,
  metadata: any = {},
  ipAddress: string | null = null,
  userAgent: string | null = null,
  sessionId: string | null = null
) {
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    // Use the database function for consistent logging
    const { data, error } = await supabase.rpc('log_user_activity', {
      p_user_id: userId,
      p_activity_type: activityType,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_metadata: metadata,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_session_id: sessionId
    });
    
    if (error) throw error;
    return data;
  }, 'Failed to log user activity');
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
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('user_purchase_history_view')
      .select('*')
      .eq('user_id', userId)
      .order('purchase_date', { ascending: false });
    
    if (filters.recordType) {
      query = query.eq('record_type', filters.recordType);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.startDate) {
      query = query.gte('purchase_date', new Date(filters.startDate).toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('purchase_date', new Date(filters.endDate).toISOString());
    }
    
    query = query.limit(filters.limit || 50).range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 50) - 1
    );
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as UserPurchaseHistoryItem[];
  }, 'Failed to get user purchase history');
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
  return withErrorHandling(async () => {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('enrollments')
      .select(`
        *,
        course:course_id(
          id,
          title,
          slug,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.startDate) {
      query = query.gte('enrolled_at', new Date(filters.startDate).toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('enrolled_at', new Date(filters.endDate).toISOString());
    }
    
    query = query.limit(filters.limit || 50).range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 50) - 1
    );
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }, 'Failed to get user enrollments');
}

// Export all functions as a unified admin users data access object
export const adminUsersDb = {
  searchUsers,
  getUserById,
  getUserDetail,
  updateUserProfile,
  addUserNote,
  updateUserNote,
  deleteUserNote,
  logAdminAction,
  getAdminAuditLog,
  getUserActivityLog,
  logUserActivity,
  getUserPurchaseHistory,
  getUserEnrollments
};
