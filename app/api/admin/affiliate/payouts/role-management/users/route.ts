/**
 * Role Management Users API
 * 
 * This endpoint provides functionality to fetch administrator users and their current payout roles.
 * It supports the role management interface by providing user data and role assignments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePayoutPermission } from '@/lib/auth/payout-permissions';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const supabase = await createServiceRoleClient();
    
    // For now, we'll need to get the user ID from headers or session
    // This would typically come from authentication middleware
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract user ID from auth (this is a simplified approach)
    // In production, you'd get this from your auth system
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Check if user has permission to manage roles
    const permissionCheck = await requirePayoutPermission(userId, 'admin.full_access');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions to view role management data',
          required_permission: 'admin.full_access'
        },
        { status: 403 }
      );
    }

    // Fetch all admin users
    const { data: adminUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        email,
        full_name,
        is_admin,
        admin_level,
        created_at,
        updated_at
      `)
      .eq('is_admin', true)
      .order('created_at', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    // Fetch current role assignments
    const { data: roleAssignments, error: rolesError } = await supabase
      .from('admin_roles')
      .select(`
        user_id,
        role_name,
        assigned_by,
        created_at as assigned_at,
        is_active
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Note: If admin_roles table doesn't exist, this will fail gracefully
    const assignments = rolesError ? [] : (roleAssignments || []);

    // Fetch recent login data (if available)
    const { data: loginData, error: loginError } = await supabase
      .from('admin_activity_logs')
      .select('user_id, created_at')
      .eq('activity_type', 'LOGIN')
      .order('created_at', { ascending: false })
      .limit(1000); // Get recent logins

    const recentLogins = loginError ? [] : (loginData || []);

    // Process and enrich user data
    const enrichedUsers = adminUsers.map((user: any) => {
      // Find current role assignment
      const currentAssignment = assignments.find((assignment: any) => 
        assignment.user_id === user.user_id
      );

      // Find most recent login
      const recentLogin = recentLogins
        .filter((login: any) => login.user_id === user.user_id)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      return {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        current_role: currentAssignment?.role_name || null,
        permissions: [], // This would be populated based on role
        last_login: recentLogin?.created_at || null,
        is_active: user.is_admin,
        admin_level: user.admin_level,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
    });

    // Log the access
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: 'Accessed role management user list',
      details: {
        user_count: enrichedUsers.length,
        role_assignments_count: assignments.length,
        target_user_id: userId
      }
    });

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      assignments: assignments,
      metadata: {
        total_users: enrichedUsers.length,
        active_assignments: assignments.length,
        fetched_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching role management users:', error);

    // Log the error
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: 'Error fetching role management user list',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to fetch role management data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 