import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create Supabase clients
    const supabase = await createServerSupabaseClient();
    const serviceClient = await createServiceRoleClient();
    
    // Check if the current user is authenticated and has admin privileges
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if the current user has admin role
    const { data: currentUserProfile } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!currentUserProfile?.is_admin) {
      return NextResponse.json(
        { message: 'Forbidden: Admin privileges required' },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const requestData = await request.json();
    
    // Basic validation
    if (!requestData.email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }
    
    const updates = [];
    
    // Update auth user if email change is requested
    if (requestData.email) {
      const { error: emailUpdateError } = await serviceClient.auth.admin.updateUserById(
        params.id,
        { email: requestData.email }
      );
      
      if (emailUpdateError) {
        console.error('Error updating user email:', emailUpdateError);
        return NextResponse.json(
          { message: 'Failed to update user email' },
          { status: 500 }
        );
      }
      
      updates.push('email');
    }
    
    // Update email verification status if requested
    if (requestData.email_confirmed !== undefined) {
      let updateData = {};
      
      if (requestData.email_confirmed) {
        updateData = { email_confirmed_at: new Date().toISOString() };
      } else {
        updateData = { email_confirmed_at: null };
      }
      
      const { error: confirmError } = await serviceClient.auth.admin.updateUserById(
        params.id,
        updateData
      );
      
      if (confirmError) {
        console.error('Error updating email confirmation status:', confirmError);
        return NextResponse.json(
          { message: 'Failed to update email confirmation status' },
          { status: 500 }
        );
      }
      
      updates.push('email verification status');
    }
    
    // Update password if provided
    if (requestData.password) {
      const { error: passwordError } = await serviceClient.auth.admin.updateUserById(
        params.id,
        { password: requestData.password }
      );
      
      if (passwordError) {
        console.error('Error updating user password:', passwordError);
        return NextResponse.json(
          { message: 'Failed to update user password' },
          { status: 500 }
        );
      }
      
      updates.push('password');
    }
    
    // Update profile settings
    const profileUpdates = {
      is_admin: requestData.admin_role,
      is_blocked: requestData.is_blocked,
      require_password_change: requestData.require_password_change,
      updated_at: new Date().toISOString()
    };
    
    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', params.id);
    
    if (profileUpdateError) {
      console.error('Error updating user profile security settings:', profileUpdateError);
      return NextResponse.json(
        { message: 'Failed to update user security settings' },
        { status: 500 }
      );
    }
    
    updates.push('security settings');
    
    return NextResponse.json(
      { 
        message: 'User security settings updated successfully',
        updates 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 