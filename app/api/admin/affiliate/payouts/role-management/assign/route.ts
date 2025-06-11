/**
 * Role Assignment API
 * 
 * This endpoint allows super administrators to assign payout roles to other users.
 * It validates permissions, creates role assignments, and logs all activities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { 
  requirePayoutPermission, 
  assignPayoutRole,
  type PayoutRole 
} from '@/lib/auth/payout-permissions';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

// Valid payout roles
const VALID_ROLES: PayoutRole[] = [
  'payout_viewer',
  'payout_operator', 
  'payout_processor',
  'payout_manager',
  'payout_admin',
  'super_admin'
];

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { user_id, role } = body;

    // Validate input
    if (!user_id || !role) {
      return NextResponse.json(
        { error: 'user_id and role are required' },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { 
          error: 'Invalid role specified',
          valid_roles: VALID_ROLES
        },
        { status: 400 }
      );
    }

    // Get current admin user ID
    // In production, this would come from authentication middleware
    const adminUserId = request.headers.get('x-user-id');
    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Admin user ID required' },
        { status: 400 }
      );
    }

    // Check if current user has permission to assign roles
    const permissionCheck = await requirePayoutPermission(adminUserId, 'admin.full_access');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions to assign roles',
          required_permission: 'admin.full_access'
        },
        { status: 403 }
      );
    }

    // Validate target user exists and is an admin
    const supabase = await createServiceRoleClient();
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, is_admin')
      .eq('user_id', user_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    if (!targetUser.is_admin) {
      return NextResponse.json(
        { error: 'Target user must be an administrator' },
        { status: 400 }
      );
    }

    // Prevent self-assignment of super admin role (security measure)
    if (role === 'super_admin' && adminUserId === user_id) {
      return NextResponse.json(
        { error: 'Cannot assign super admin role to yourself' },
        { status: 400 }
      );
    }

    // Check if assigning user has sufficient privileges
    // Only super admins can assign super admin roles
    if (role === 'super_admin') {
      const adminPermissionCheck = await requirePayoutPermission(adminUserId, 'admin.full_access');
      const adminRole = adminPermissionCheck.role;
      
      if (adminRole !== 'super_admin') {
        return NextResponse.json(
          { error: 'Only super administrators can assign super admin roles' },
          { status: 403 }
        );
      }
    }

    // Use the assignPayoutRole function from the permissions module
    const assignmentResult = await assignPayoutRole(adminUserId, user_id, role);

    if (!assignmentResult.success) {
      return NextResponse.json(
        { 
          error: assignmentResult.error || 'Failed to assign role',
          details: 'Role assignment operation failed'
        },
        { status: 500 }
      );
    }

    // Log successful assignment
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Successfully assigned role '${role}' to user ${targetUser.email}`,
      details: {
        target_user_id: user_id,
        target_user_email: targetUser.email,
        assigned_role: role,
        admin_user_id: adminUserId,
        assignment_timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Role '${role}' assigned successfully to ${targetUser.email}`,
      assignment: {
        user_id,
        role,
        assigned_by: adminUserId,
        assigned_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error assigning payout role:', error);

    // Log the error
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: 'Error occurred during role assignment',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        request_body: await request.clone().json().catch(() => null)
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to assign role',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 