import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
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
    
    // Parse the request body
    const requestData = await request.json();
    
    // Basic validation
    if (!requestData.first_name || !requestData.last_name) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(params.id);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Update the user profile
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        first_name: requestData.first_name,
        last_name: requestData.last_name,
        phone: requestData.phone || null,
        role: requestData.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);
    
    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }
    
    // Get updated profile data
    const { data: updatedProfile, error: fetchError } = await adminClient
      .from('profiles')
      .select(`
        *,
        auth_users:auth.users!user_id(
          email_confirmed_at,
          last_sign_in_at
        )
      `)
      .eq('id', params.id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching updated profile:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 