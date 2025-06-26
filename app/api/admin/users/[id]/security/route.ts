import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

// PATCH to update user security settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }
    
    // Use admin client for database operations
    const adminClient = getAdminClient();
    
    // Check if user exists
    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(id);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Handle password update if provided
    if (body.password) {
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(
        id,
        { password: body.password }
      );
      
      if (passwordError) {
        return NextResponse.json(
          { error: 'Failed to update password' },
          { status: 500 }
        );
      }
    }
    
    // Handle email update if provided
    if (body.email && body.email !== user.user.email) {
      const { error: emailError } = await adminClient.auth.admin.updateUserById(
        id,
        { 
          email: body.email,
          email_confirm: true
        }
      );
      
      if (emailError) {
        return NextResponse.json(
          { error: 'Failed to update email' },
          { status: 500 }
        );
      }
      
      // Update email in unified_profiles table
      const { error: profileError } = await adminClient
        .from('unified_profiles')
        .update({ 
          email: body.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (profileError) {
        return NextResponse.json(
          { error: 'Failed to update profile email' },
          { status: 500 }
        );
      }
    }

    // Handle email verification status change
    if (body.email_confirmed !== undefined) {
      const { error: confirmError } = await adminClient.auth.admin.updateUserById(
        id,
        { 
          email_confirm: body.email_confirmed
        }
      );
      
      if (confirmError) {
        return NextResponse.json(
          { error: 'Failed to update email verification status' },
          { status: 500 }
        );
      }
    }
    
    // Handle admin role update, blocking status, and password requirements
    const profileUpdates: any = {};
    let shouldUpdateProfile = false;

    // Handle admin role toggle
    if (body.admin_role !== undefined) {
      profileUpdates.is_admin = body.admin_role;
      shouldUpdateProfile = true;
    }

    // Handle blocking status (map is_blocked to status field)
    if (body.is_blocked !== undefined) {
      profileUpdates.status = body.is_blocked ? 'blocked' : 'active';
      shouldUpdateProfile = true;
      
      // Also update Supabase Auth user metadata
      const { error: statusError } = await adminClient.auth.admin.updateUserById(
        id,
        { 
          ban_duration: body.is_blocked ? 'infinite' : undefined,
          user_metadata: {
            ...user.user.user_metadata,
            blocked_at: body.is_blocked ? new Date().toISOString() : null,
            blocked_reason: body.is_blocked ? 'Account blocked by admin' : null
          }
        }
      );
      
      if (statusError) {
        return NextResponse.json(
          { error: 'Failed to update account status in auth' },
          { status: 500 }
        );
      }
    }

    // Handle password change requirement (store in admin_metadata)
    if (body.require_password_change !== undefined) {
      // Get current admin_metadata and update it
      const { data: currentProfile } = await adminClient
        .from('unified_profiles')
        .select('admin_metadata')
        .eq('id', id)
        .single();
        
      const currentMetadata = (currentProfile?.admin_metadata as Record<string, any>) || {};
      profileUpdates.admin_metadata = {
        ...currentMetadata,
        requirePasswordChange: body.require_password_change,
        passwordChangeRequestedAt: body.require_password_change ? new Date().toISOString() : null
      };
      shouldUpdateProfile = true;
    }

    // Update unified_profiles table if needed
    if (shouldUpdateProfile) {
      profileUpdates.updated_at = new Date().toISOString();
      
      const { error: profileError } = await adminClient
        .from('unified_profiles')
        .update(profileUpdates)
        .eq('id', id);
      
      if (profileError) {
        console.error('Profile update error:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile settings' },
          { status: 500 }
        );
      }
    }
    
    // Get updated user data
    const { data: updatedUser, error: fetchError } = await adminClient.auth.admin.getUserById(id);
    
    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch updated user data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user security:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 