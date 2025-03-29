import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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
    
    // Get user data first
    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(params.id);
      
    if (userError || !user || !user.user.email) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'User not found or has no email' },
        { status: 404 }
      );
    }
    
    // If email is already confirmed, return error
    if (user.user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }
    
    // Generate an email verification link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: user.user.email,
    });
    
    if (linkError) {
      console.error('Error generating verification link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Verification email sent successfully',
      email: user.user.email
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 