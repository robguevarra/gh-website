/**
 * Permission Check API
 * 
 * This endpoint allows frontend components to check if the current user has specific permissions.
 * It's used by the role management interface to determine what actions are available.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkPayoutPermission, type PayoutPermission } from '@/lib/auth/payout-permissions';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { permission, context } = body;

    // Validate input
    if (!permission) {
      return NextResponse.json(
        { error: 'permission is required' },
        { status: 400 }
      );
    }

    // Get current user from session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check the permission
    const permissionResult = await checkPayoutPermission(
      user.id, 
      permission as PayoutPermission,
      context
    );

    // Log permission check (for audit purposes)
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Permission check: ${permission}`,
      details: {
        permission,
        granted: permissionResult.granted,
        reason: permissionResult.reason,
        user_role: permissionResult.userRole,
        context,
        target_user_id: user.id
      }
    });

    return NextResponse.json({
      granted: permissionResult.granted,
      reason: permissionResult.reason,
      user_role: permissionResult.userRole,
      requires_additional_auth: permissionResult.requiresAdditionalAuth,
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking permissions:', error);

    // Log the error
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: 'Error during permission check',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to check permissions',
        granted: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 