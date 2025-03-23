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
      .select('email, email_confirmed_at')
      .eq('id', params.id)
      .single();
      
    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // If email is already confirmed, return error
    if (userData.email_confirmed_at) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 400 }
      );
    }
    
    // Generate an email verification link
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
    });
    
    if (linkError) {
      console.error('Error generating verification link:', linkError);
      return NextResponse.json(
        { message: 'Failed to generate verification link' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Verification email sent successfully',
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