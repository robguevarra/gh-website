import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';
import { generateMagicLink } from '@/lib/auth/magic-link-service';
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service';

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

    // Get user profile to get the first name for email personalization
    let firstName = 'User';
    try {
      const { data: profile } = await adminClient
        .from('unified_profiles')
        .select('first_name')
        .eq('email', user.user.email)
        .maybeSingle();
      
      if (profile?.first_name) {
        firstName = profile.first_name;
      }
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Continue with default name if profile fetch fails
    }
    
    // Generate magic link for password reset
    const magicLinkResult = await generateMagicLink({
      email: user.user.email,
      purpose: 'password_reset',
      redirectTo: '/auth/update-password',
      expiresIn: '24h',
      metadata: {
        requestedBy: 'admin',
        adminInitiated: true,
        timestamp: new Date().toISOString()
      }
    });
    
    if (!magicLinkResult.success || !magicLinkResult.magicLink) {
      console.error('Error generating magic link:', magicLinkResult.error);
      return NextResponse.json(
        { error: 'Failed to generate password reset link' },
        { status: 500 }
      );
    }
    
    // Send password reset email using our transactional email service
    try {
      await sendTransactionalEmail(
        'Password Reset Magic Link',
        user.user.email,
        {
          first_name: firstName,
          magic_link: magicLinkResult.magicLink,
          expiration_hours: '24',
          requested_from_device: 'Admin Panel'
        }
      );
      
      console.log(`[Admin Password Reset] Email sent successfully to ${user.user.email}`);
    } catch (emailError) {
      console.error('[Admin Password Reset] Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Password reset email sent successfully',
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