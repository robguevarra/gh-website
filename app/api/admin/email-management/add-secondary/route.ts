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

    // -------------------------------------------------------------------
    //  Auto-link Shopify layer (customers + orders) to this profile
    // -------------------------------------------------------------------
    // 1. Upsert shopify_customer row for the secondary email;
    //    creates a minimal record if none exists, otherwise just sets the linkage.
    const { data: existingCustomer } = await adminClient
      .from('shopify_customers')
      .select('id')
      .eq('email', lowerEmail)
      .maybeSingle();

    let targetCustomerId = existingCustomer?.id as string | undefined;

    if (targetCustomerId) {
      // update linkage if missing
      await adminClient
        .from('shopify_customers')
        .update({ unified_profile_id: userId, updated_at: new Date().toISOString() })
        .eq('id', targetCustomerId);
    } else {
      // create minimal customer row (shopify_customer_id left NULL for historical)
      const { data: newCust, error: custErr } = await adminClient
        .from('shopify_customers')
        .insert({ email: lowerEmail, unified_profile_id: userId, shopify_customer_id: null as any })
        .select('id')
        .maybeSingle();
      if (!custErr && newCust) targetCustomerId = newCust.id;
    }

    if (targetCustomerId) {
      // 2. Attach any orders still missing customer_id but matching this email
      await adminClient
        .from('shopify_orders')
        .update({ customer_id: targetCustomerId, updated_at: new Date().toISOString() })
        .is('customer_id', null)
        .eq('email', lowerEmail);
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