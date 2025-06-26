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
    const { unifiedProfileId, shopifyCustomerId, notes = '' } = body;

    if (!unifiedProfileId || !shopifyCustomerId) {
      return NextResponse.json(
        { error: 'unifiedProfileId and shopifyCustomerId are required' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // Verify unified profile exists
    const { data: unifiedProfile, error: profileError } = await adminClient
      .from('unified_profiles')
      .select('id, email, first_name, last_name')
      .eq('id', unifiedProfileId)
      .single();

    if (profileError || !unifiedProfile) {
      return NextResponse.json(
        { error: 'Unified profile not found' },
        { status: 404 }
      );
    }

    // Verify Shopify customer exists and is not already linked
    const { data: shopifyCustomer, error: customerError } = await adminClient
      .from('shopify_customers')
      .select('id, email, first_name, last_name, unified_profile_id')
      .eq('id', shopifyCustomerId)
      .single();

    if (customerError || !shopifyCustomer) {
      return NextResponse.json(
        { error: 'Shopify customer not found' },
        { status: 404 }
      );
    }

    // Check if already linked to this or another profile
    if (shopifyCustomer.unified_profile_id) {
      if (shopifyCustomer.unified_profile_id === unifiedProfileId) {
        return NextResponse.json(
          { error: 'Shopify customer is already linked to this profile' },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: 'Shopify customer is already linked to another profile' },
          { status: 409 }
        );
      }
    }

    // Perform the linking
    const { error: linkError } = await adminClient
      .from('shopify_customers')
      .update({
        unified_profile_id: unifiedProfileId,
        manual_link_notes: notes,
        linked_by: validation.user.id,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', shopifyCustomerId);

    if (linkError) {
      console.error('Error linking Shopify customer:', linkError);
      return NextResponse.json(
        { error: 'Failed to link Shopify customer' },
        { status: 500 }
      );
    }

    // Log the change
    try {
      await adminClient
        .from('email_change_log' as any)
        .insert({
          user_id: unifiedProfileId,
          old_email: shopifyCustomer.email,
          new_email: unifiedProfile.email,
          changed_by: validation.user.id,
          change_type: 'shopify_link',
          verification_status: 'manual_verified'
        });
    } catch (logError) {
      console.error('Failed to log Shopify linking:', logError);
      // Don't fail the main operation for logging issues
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify customer linked successfully',
      linkDetails: {
        unifiedProfile: {
          id: unifiedProfile.id,
          email: unifiedProfile.email,
          name: `${unifiedProfile.first_name || ''} ${unifiedProfile.last_name || ''}`.trim()
        },
        shopifyCustomer: {
          id: shopifyCustomer.id,
          email: shopifyCustomer.email,
          name: `${shopifyCustomer.first_name || ''} ${shopifyCustomer.last_name || ''}`.trim()
        },
        notes,
        linkedAt: new Date().toISOString(),
        linkedBy: validation.user.id
      }
    });

  } catch (error) {
    console.error('Error linking Shopify customer:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 