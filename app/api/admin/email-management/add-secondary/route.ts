import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const body = await request.json();
    const { userId, secondaryEmail } = body;

    if (!userId || !secondaryEmail) {
      return NextResponse.json(
        { error: 'userId and secondaryEmail are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(secondaryEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    const lowerEmail = secondaryEmail.toLowerCase().trim();

    // Get current user data
    const { data: currentProfile, error: profileError } = await adminClient
      .from('unified_profiles')
      .select('email, admin_metadata, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if this email is already primary
    if (currentProfile.email === lowerEmail) {
      return NextResponse.json(
        { error: 'Email is already the primary email' },
        { status: 409 }
      );
    }

    // Get current secondary emails from admin_metadata
    const currentMetadata = (currentProfile.admin_metadata as any) || {};
    const currentSecondaryEmails: string[] = currentMetadata.secondary_emails || [];

    // Check if email is already in secondary emails
    if (currentSecondaryEmails.includes(lowerEmail)) {
      return NextResponse.json(
        { error: 'Email is already in secondary emails' },
        { status: 409 }
      );
    }

    // Check if email exists for another user
    const { data: existingProfile } = await adminClient
      .from('unified_profiles')
      .select('id')
      .eq('email', lowerEmail)
      .neq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Email already exists for another user' },
        { status: 409 }
      );
    }

    // Add email to secondary emails
    const updatedSecondaryEmails = [...currentSecondaryEmails, lowerEmail];
    const updatedMetadata = {
      ...(currentMetadata as object),
      secondary_emails: updatedSecondaryEmails
    };

    // Update the unified_profiles record
    const { error: updateError } = await adminClient
      .from('unified_profiles')
      .update({
        admin_metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating secondary emails:', updateError);
      return NextResponse.json(
        { error: 'Failed to update secondary emails' },
        { status: 500 }
      );
    }

    // Log the change
    try {
      await adminClient
        .from('email_change_log' as any)
        .insert({
          user_id: userId,
          old_email: null,
          new_email: lowerEmail,
          changed_by: validation.user.id,
          change_type: 'secondary_add',
          verification_status: 'pending'
        });
    } catch (logError) {
      console.error('Failed to log secondary email addition:', logError);
      // Don't fail the main operation for logging issues
    }

    return NextResponse.json({
      success: true,
      message: 'Secondary email added successfully',
      secondaryEmail: lowerEmail,
      allSecondaryEmails: updatedSecondaryEmails
    });

  } catch (error) {
    console.error('Error adding secondary email:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 