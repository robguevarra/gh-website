import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    const { data: adminProfile } = await serviceClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { message: 'Forbidden: Admin privileges required' },
        { status: 403 }
      );
    }
    
    // Get user email first
    const { data: userData, error: userError } = await serviceClient
      .from('auth.users')
      .select('email')
      .eq('id', params.id)
      .single();
      
    if (userError || !userData) {
      console.error('Error fetching user email:', userError);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Generate a password reset link
    const { data: resetData, error: resetError } = await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email: userData.email,
    });
    
    if (resetError) {
      console.error('Error generating password reset link:', resetError);
      return NextResponse.json(
        { message: 'Failed to generate password reset link' },
        { status: 500 }
      );
    }
    
    // Update profile to require password change on next login
    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({
        require_password_change: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);
    
    if (profileUpdateError) {
      console.error('Error updating profile require_password_change flag:', profileUpdateError);
      // We'll still return success since the reset email was sent
    }
    
    return NextResponse.json(
      { 
        message: 'Password reset email sent successfully',
        email: userData.email
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