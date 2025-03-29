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
    const { id } = params;
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
      
      // Update email in profiles table
      const { error: profileError } = await adminClient
        .from('profiles')
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
    
    // Handle account status update if provided
    if (body.disabled !== undefined) {
      const { error: statusError } = await adminClient.auth.admin.updateUserById(
        id,
        { 
          ban_duration: body.disabled ? 'infinite' : undefined,
          user_metadata: {
            ...user.user.user_metadata,
            disabled_at: body.disabled ? new Date().toISOString() : null,
            disabled_reason: body.disabled ? (body.reason || 'Account disabled by admin') : null
          }
        }
      );
      
      if (statusError) {
        return NextResponse.json(
          { error: 'Failed to update account status' },
          { status: 500 }
        );
      }
      
      // Update status in profiles table
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ 
          status: body.disabled ? 'disabled' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (profileError) {
        return NextResponse.json(
          { error: 'Failed to update profile status' },
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