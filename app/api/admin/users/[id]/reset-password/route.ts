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
    
    // Get user email first
    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(params.id);
      
    if (userError || !user || !user.user.email) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'User not found or has no email' },
        { status: 404 }
      );
    }
    
    // Generate a password reset link
    const { data: resetData, error: resetError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: user.user.email,
    });
    
    if (resetError) {
      console.error('Error generating password reset link:', resetError);
      return NextResponse.json(
        { error: 'Failed to generate password reset link' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Password reset link generated successfully',
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