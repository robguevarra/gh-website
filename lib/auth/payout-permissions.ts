/**
 * Payout Permission System
 * 
 * This module provides fine-grained permission controls for payout management operations.
 * It implements role-based access control (RBAC) with specific roles for different payout operations.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

// Payout permission types
export type PayoutPermission = 
  | 'payout.view'           // View payout data
  | 'payout.preview'        // Generate payout previews
  | 'payout.verify'         // Verify payouts for processing
  | 'payout.process'        // Process payouts (send to Xendit)
  | 'payout.cancel'         // Cancel pending payouts
  | 'payout.export'         // Export payout data
  | 'payout.monitor'        // Access monitoring dashboard
  | 'payout.reports'        // Generate and access reports
  | 'payout.error_resolve'  // Resolve payout errors
  | 'payout.high_value'     // Handle high-value payouts (above threshold)
  | 'conversion.view'       // View conversion data
  | 'conversion.verify'     // Verify conversions
  | 'conversion.update'     // Update conversion status
  | 'admin.full_access';    // Full administrative access

// Payout role definitions
export type PayoutRole = 
  | 'payout_viewer'         // Can only view payout data
  | 'payout_operator'       // Can view, preview, and verify payouts
  | 'payout_processor'      // Can process verified payouts
  | 'payout_manager'        // Can handle high-value payouts and errors
  | 'payout_admin'          // Full payout system access
  | 'super_admin';          // Full system access

// Role-to-permission mapping
const ROLE_PERMISSIONS: Record<PayoutRole, PayoutPermission[]> = {
  payout_viewer: [
    'payout.view',
    'payout.monitor',
    'payout.reports',
    'conversion.view'
  ],
  payout_operator: [
    'payout.view',
    'payout.preview',
    'payout.verify',
    'payout.export',
    'payout.monitor',
    'payout.reports',
    'conversion.view',
    'conversion.verify',
    'conversion.update'
  ],
  payout_processor: [
    'payout.view',
    'payout.preview',
    'payout.verify',
    'payout.process',
    'payout.cancel',
    'payout.export',
    'payout.monitor',
    'payout.reports',
    'payout.error_resolve',
    'conversion.view',
    'conversion.verify',
    'conversion.update'
  ],
  payout_manager: [
    'payout.view',
    'payout.preview',
    'payout.verify',
    'payout.process',
    'payout.cancel',
    'payout.export',
    'payout.monitor',
    'payout.reports',
    'payout.error_resolve',
    'payout.high_value',
    'conversion.view',
    'conversion.verify',
    'conversion.update'
  ],
  payout_admin: [
    'payout.view',
    'payout.preview',
    'payout.verify',
    'payout.process',
    'payout.cancel',
    'payout.export',
    'payout.monitor',
    'payout.reports',
    'payout.error_resolve',
    'payout.high_value',
    'conversion.view',
    'conversion.verify',
    'conversion.update'
  ],
  super_admin: [
    'admin.full_access' // Super admin has all permissions
  ]
};

// High-value payout threshold (configurable via environment)
const HIGH_VALUE_THRESHOLD = Number(process.env.PAYOUT_HIGH_VALUE_THRESHOLD) || 1000; // $1000 USD

// Permission check result interface
interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  requiresAdditionalAuth?: boolean;
  userRole?: PayoutRole;
}

// IP restriction interface
interface IPRestriction {
  ip_address?: string;
  ip_range?: string;
  is_active: boolean;
}

// Activity log interface
interface ActivityLog {
  created_at: string;
  details?: {
    ip_address?: string;
    [key: string]: any;
  };
}

/**
 * Check if a user has a specific payout permission
 */
export async function checkPayoutPermission(
  userId: string,
  permission: PayoutPermission,
  context?: {
    payoutAmount?: number;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<PermissionCheckResult> {
  const supabase = await createServiceRoleClient();
  
  try {
    // Get user profile and role information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return {
        granted: false,
        reason: 'User profile not found'
      };
    }

    // Check if user is admin
    if (!profile.is_admin) {
      return {
        granted: false,
        reason: 'User is not an admin'
      };
    }

    // Get user's payout role
    const userRole = await getUserPayoutRole(userId);
    if (!userRole) {
      return {
        granted: false,
        reason: 'No payout role assigned'
      };
    }

    // Check for super admin privileges
    if (userRole === 'super_admin' || ROLE_PERMISSIONS[userRole].includes('admin.full_access')) {
      return {
        granted: true,
        userRole
      };
    }

    // Check if role has the required permission
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions.includes(permission)) {
      return {
        granted: false,
        reason: `Role '${userRole}' does not have '${permission}' permission`,
        userRole
      };
    }

    // Additional checks for high-value payouts
    if (context?.payoutAmount && context.payoutAmount >= HIGH_VALUE_THRESHOLD) {
      if (!rolePermissions.includes('payout.high_value')) {
        return {
          granted: false,
          reason: `High-value payout (${context.payoutAmount}) requires 'payout.high_value' permission`,
          requiresAdditionalAuth: true,
          userRole
        };
      }
    }

    // Log permission check for audit trail
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Permission check for '${permission}' by user ${userId}`,
      details: {
        permission,
        userRole,
        granted: true,
        context,
        target_user_id: userId
      }
    });

    return {
      granted: true,
      userRole
    };

  } catch (error) {
    console.error('Error checking payout permission:', error);
    return {
      granted: false,
      reason: 'Permission check failed due to system error'
    };
  }
}

/**
 * Get user's payout role from database
 */
async function getUserPayoutRole(userId: string): Promise<PayoutRole | null> {
  const supabase = await createServiceRoleClient();
  
  try {
    // Check for role assignment in admin_roles table (if it exists)
    const { data: roleData, error: roleError } = await supabase
      .from('admin_roles')
      .select('role_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (roleData && !roleError) {
      return roleData.role_name as PayoutRole;
    }

    // Fallback: Check user profile for basic admin status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin, admin_level')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return null;
    }

    // Default role assignment based on admin level
    switch (profile.admin_level) {
      case 'super':
        return 'super_admin';
      case 'high':
        return 'payout_admin';
      case 'medium':
        return 'payout_manager';
      case 'low':
        return 'payout_operator';
      default:
        return 'payout_viewer';
    }

  } catch (error) {
    console.error('Error getting user payout role:', error);
    return null;
  }
}

/**
 * Check multiple permissions at once
 */
export async function checkMultiplePermissions(
  userId: string,
  permissions: PayoutPermission[],
  context?: {
    payoutAmount?: number;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Record<PayoutPermission, PermissionCheckResult>> {
  const results: Record<PayoutPermission, PermissionCheckResult> = {} as any;
  
  for (const permission of permissions) {
    results[permission] = await checkPayoutPermission(userId, permission, context);
  }
  
  return results;
}

/**
 * Middleware function to protect payout routes
 */
export async function requirePayoutPermission(
  userId: string,
  permission: PayoutPermission,
  context?: {
    payoutAmount?: number;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ authorized: boolean; error?: string; role?: PayoutRole }> {
  const result = await checkPayoutPermission(userId, permission, context);
  
  if (!result.granted) {
    // Log unauthorized access attempt
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Attempted access to '${permission}' without authorization by user ${userId}`,
      details: {
        permission,
        reason: result.reason,
        context,
        ip_address: context?.ipAddress,
        user_agent: context?.userAgent,
        target_user_id: userId
      }
    });
    
    return {
      authorized: false,
      error: result.reason || 'Access denied'
    };
  }
  
  return {
    authorized: true,
    role: result.userRole
  };
}

/**
 * Get all permissions for a user's current role
 */
export async function getUserPermissions(userId: string): Promise<PayoutPermission[]> {
  const role = await getUserPayoutRole(userId);
  if (!role) {
    return [];
  }
  
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if IP address is allowed for high-value operations
 */
export async function checkIPRestriction(
  userId: string, 
  ipAddress: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createServiceRoleClient();
  
  try {
    // Check for IP restrictions in admin_ip_restrictions table (if it exists)
    const { data: ipRestrictions, error } = await supabase
      .from('admin_ip_restrictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      // If table doesn't exist or error occurs, allow access (fail open for now)
      return { allowed: true };
    }

    // If no restrictions are set, allow access
    if (!ipRestrictions || ipRestrictions.length === 0) {
      return { allowed: true };
    }

    // Check if current IP is in allowed list
    const isAllowed = ipRestrictions.some((restriction: IPRestriction) => {
      return ipAddress === restriction.ip_address || 
             (restriction.ip_range && isIPInRange(ipAddress, restriction.ip_range));
    });

    if (!isAllowed) {
      // Log IP restriction violation
      await logAdminActivity({
        activity_type: 'GENERAL_ADMIN_ACTION',
        description: `Access attempted from restricted IP: ${ipAddress} by user ${userId}`,
        details: {
          ip_address: ipAddress,
          allowed_ips: ipRestrictions.map((r: IPRestriction) => r.ip_address || r.ip_range),
          target_user_id: userId
        }
      });
    }

    return {
      allowed: isAllowed,
      reason: isAllowed ? undefined : 'IP address not in allowed list'
    };

  } catch (error) {
    console.error('Error checking IP restriction:', error);
    // Fail open in case of system error
    return { allowed: true };
  }
}

/**
 * Simple IP range check (basic implementation)
 */
function isIPInRange(ip: string, range: string): boolean {
  // Basic CIDR notation check - this would need a proper implementation
  // For now, just return false as a placeholder
  return false;
}

/**
 * Detect suspicious activity patterns
 */
export async function detectSuspiciousActivity(
  userId: string,
  action: string,
  context: {
    ipAddress?: string;
    userAgent?: string;
    payoutAmount?: number;
  }
): Promise<{ suspicious: boolean; reason?: string; riskLevel: 'low' | 'medium' | 'high' }> {
  const supabase = await createServiceRoleClient();
  
  try {
    // Get recent activity for this user
    const { data: recentActivity, error } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return { suspicious: false, riskLevel: 'low' };
    }

    const activities: ActivityLog[] = recentActivity || [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let suspicious = false;
    let reason = '';

    // Check for rapid successive actions
    const recentActions = activities.filter((a: ActivityLog) => 
      new Date(a.created_at).getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentActions.length > 10) {
      suspicious = true;
      riskLevel = 'high';
      reason = 'High frequency of actions in short time period';
    }

    // Check for unusual IP addresses
    const recentIPs = [...new Set(activities
      .map((a: ActivityLog) => a.details?.ip_address)
      .filter(Boolean)
    )];

    if (recentIPs.length > 3 && context.ipAddress && !recentIPs.includes(context.ipAddress)) {
      suspicious = true;
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      reason = reason || 'Access from new IP address';
    }

    // Check for high-value operations
    if (context.payoutAmount && context.payoutAmount > HIGH_VALUE_THRESHOLD * 2) {
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      if (context.payoutAmount > HIGH_VALUE_THRESHOLD * 5) {
        suspicious = true;
        riskLevel = 'high';
        reason = reason || 'Extremely high payout amount';
      }
    }

    // Log suspicious activity detection
    if (suspicious || riskLevel !== 'low') {
      await logAdminActivity({
        activity_type: 'GENERAL_ADMIN_ACTION',
        description: `Suspicious activity detected: ${action} by user ${userId}`,
        details: {
          action,
          context,
          riskLevel,
          reason,
          recent_activity_count: activities.length,
          recent_ips: recentIPs.filter(ip => typeof ip === 'string'),
          target_user_id: userId
        }
      });
    }

    return { suspicious, reason, riskLevel };

  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    return { suspicious: false, riskLevel: 'low' };
  }
}

/**
 * Create admin role assignment
 */
export async function assignPayoutRole(
  adminUserId: string,
  targetUserId: string,
  role: PayoutRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceRoleClient();
  
  try {
    // Check if assigning admin has permission to manage roles
    const permissionCheck = await checkPayoutPermission(adminUserId, 'admin.full_access');
    if (!permissionCheck.granted) {
      return {
        success: false,
        error: 'Insufficient permissions to assign roles'
      };
    }

    // Deactivate existing roles for the user
    await supabase
      .from('admin_roles')
      .update({ is_active: false })
      .eq('user_id', targetUserId);

    // Create new role assignment
    const { error } = await supabase
      .from('admin_roles')
      .insert({
        user_id: targetUserId,
        role_name: role,
        assigned_by: adminUserId,
        is_active: true
      });

    if (error) {
      throw error;
    }

    // Log role assignment
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Assigned role '${role}' to user ${targetUserId}`,
      details: {
        target_user_id: targetUserId,
        role,
        action: 'assign',
        admin_user_id: adminUserId
      }
    });

    return { success: true };

  } catch (error) {
    console.error('Error assigning payout role:', error);
    return {
      success: false,
      error: 'Failed to assign role due to system error'
    };
  }
} 