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
    const { userId, newEmail, verification = false } = body;

    if (!userId || !newEmail) {
      return NextResponse.json(
        { error: 'userId and newEmail are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    const lowerNewEmail = newEmail.toLowerCase().trim();

    // Get current user data
    const { data: currentProfile, error: profileError } = await adminClient
      .from('unified_profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if new email already exists
    const { data: existingProfile } = await adminClient
      .from('unified_profiles')
      .select('id')
      .eq('email', lowerNewEmail)
      .neq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Email already exists for another user' },
        { status: 409 }
      );
    }

    const oldEmail = currentProfile.email;
    
    // Start transaction - cascade email updates across all tables
    const updates = await Promise.allSettled([
      // 1. Update auth.users
      adminClient.auth.admin.updateUserById(userId, { email: lowerNewEmail }),
      
      // 2. Update unified_profiles
      adminClient
        .from('unified_profiles')
        .update({ 
          email: lowerNewEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId),
      
      // 3. Update transactions table (contact_email field)
      adminClient
        .from('transactions')
        .update({ contact_email: lowerNewEmail })
        .eq('contact_email', oldEmail),
      
      // 4. Update purchase_leads table
      adminClient
        .from('purchase_leads')
        .update({ email: lowerNewEmail })
        .eq('email', oldEmail),
      
      // 5. Update ebook_contacts table  
      adminClient
        .from('ebook_contacts')
        .update({ email: lowerNewEmail })
        .eq('email', oldEmail)
    ]);

    // Check for any failed updates
    const failures = updates.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some email updates failed:', failures);
      // Note: This is a partial failure - some updates may have succeeded
    }

    // Log the email change - use manual query to avoid type issues for now
    try {
      await adminClient
        .from('email_change_log' as any)
        .insert({
          user_id: userId,
          old_email: oldEmail,
          new_email: lowerNewEmail,
          changed_by: validation.user.id,
          change_type: 'primary_update',
          verification_status: verification ? 'verified' : 'pending'
        });
    } catch (logError) {
      console.error('Failed to log email change:', logError);
      // Don't fail the main operation for logging issues
    }

    return NextResponse.json({
      success: true,
      message: 'Primary email updated successfully',
      oldEmail,
      newEmail: lowerNewEmail,
      updatesAttempted: updates.length,
      updateFailures: failures.length
    });

  } catch (error) {
    console.error('Error updating primary email:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 