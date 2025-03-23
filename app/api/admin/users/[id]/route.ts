import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      return NextResponse.json(
        { message: 'Forbidden: Admin privileges required' },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const requestData = await request.json();
    
    // Basic validation
    if (!requestData.first_name || !requestData.last_name) {
      return NextResponse.json(
        { message: 'First name and last name are required' },
        { status: 400 }
      );
    }
    
    // Update the user profile with the service role client
    const { error: updateError } = await serviceClient
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
        { message: 'Failed to update user profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'User profile updated successfully' },
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