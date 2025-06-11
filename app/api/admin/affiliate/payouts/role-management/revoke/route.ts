/**
 * Role Revocation API
 * 
 * This endpoint allows super administrators to revoke payout roles from users.
 * It validates permissions, deactivates role assignments, and logs all activities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePayoutPermission } from '@/lib/auth/payout-permissions';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { user_id } = body;

    // Validate input
    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
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

    // Check if current user has permission to revoke roles
    const permissionCheck = await requirePayoutPermission(adminUserId, 'admin.full_access');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions to revoke roles',
          required_permission: 'admin.full_access'
        },
        { status: 403 }
      );
    }

    // Validate target user exists
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

    // Prevent self-revocation (security measure)
    if (adminUserId === user_id) {
      return NextResponse.json(
        { error: 'Cannot revoke your own role' },
        { status: 400 }
      );
    }

    // Check if user currently has any active roles
    const { data: currentRoles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('role_name, created_at, assigned_by')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (rolesError) {
      // If table doesn't exist, treat as no roles to revoke
      if (rolesError.code === '42P01') {
        return NextResponse.json(
          { error: 'No role assignments found to revoke' },
          { status: 404 }
        );
      }
      throw rolesError;
    }

    if (!currentRoles || currentRoles.length === 0) {
      return NextResponse.json(
        { error: 'User has no active roles to revoke' },
        { status: 404 }
      );
    }

    // Deactivate all current roles for the user
    const { error: revokeError } = await supabase
      .from('admin_roles')
      .update({ 
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: adminUserId
      })
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (revokeError) {
      throw revokeError;
    }

    // Log the revocation
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Revoked all payout roles from user ${targetUser.email}`,
      details: {
        target_user_id: user_id,
        target_user_email: targetUser.email,
        revoked_roles: currentRoles.map(role => role.role_name),
        admin_user_id: adminUserId,
        revocation_timestamp: new Date().toISOString(),
        previous_assignments: currentRoles
      }
    });

    return NextResponse.json({
      success: true,
      message: `All payout roles revoked successfully from ${targetUser.email}`,
      revocation: {
        user_id,
        revoked_roles: currentRoles.map(role => role.role_name),
        revoked_by: adminUserId,
        revoked_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error revoking payout role:', error);

    // Log the error
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: 'Error occurred during role revocation',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        request_body: await request.clone().json().catch(() => null)
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to revoke roles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 