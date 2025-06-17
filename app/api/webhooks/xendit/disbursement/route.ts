import { NextRequest, NextResponse } from 'next/server';
import { xenditPayoutService, XenditUtils } from '@/lib/services/xendit/disbursement-service';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Xendit Payouts Webhook Handler (v2 API)
 * 
 * This endpoint receives webhook notifications from Xendit when payout statuses change.
 * Updated to handle the new v2 Payouts API payload structure.
 */

interface XenditPayoutWebhookPayload {
  id: string;
  amount: number;
  channel_code: string;
  currency: string;
  description: string;
  reference_id: string;
  status: 'ACCEPTED' | 'PENDING' | 'LOCKED' | 'CANCELLED' | 'SUCCEEDED' | 'FAILED';
  created: string;
  updated: string;
  estimated_arrival_time?: string;
  business_id: string;
  channel_properties: {
    account_number: string;
    account_holder_name: string;
  };
  receipt_notification?: {
    email_to?: string[];
    email_cc?: string[];
    email_bcc?: string[];
  };
  metadata?: {
    affiliate_id?: string;
    payout_id?: string;
    system?: string;
  };
  failure_code?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-callback-token') || '';
    
    // Verify webhook signature for security
    const isValidSignature = xenditPayoutService.verifyWebhookSignature(rawBody, signature);
    
    if (!isValidSignature) {
      console.error('Invalid webhook signature received');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let payload: XenditPayoutWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.id || !payload.reference_id || !payload.status) {
      console.error('Missing required fields in webhook payload:', payload);
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Processing Xendit payout webhook (v2):', {
      id: payload.id,
      reference_id: payload.reference_id,
      status: payload.status,
      amount: payload.amount,
      channel_code: payload.channel_code,
      currency: payload.currency,
    });

    // Initialize Supabase client
    const supabase = await createServiceRoleClient();

    // Find the payout record by reference_id
    // The reference_id should match our payout reference or follow pattern "payout_{id}"
    let payoutQuery = supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('reference', payload.reference_id);

    // If not found by reference, try extracting payout ID from reference_id
    if (payload.reference_id.startsWith('payout_')) {
      const payoutIdMatch = payload.reference_id.match(/payout_([a-f0-9-]+)/);
      if (payoutIdMatch) {
        payoutQuery = payoutQuery.or(`id.eq.${payoutIdMatch[1]}`);
      }
    }

    // Also try to find by metadata if available
    if (payload.metadata?.payout_id) {
      payoutQuery = payoutQuery.or(`id.eq.${payload.metadata.payout_id}`);
    }

    const { data: payouts, error: payoutError } = await payoutQuery;

    if (payoutError) {
      console.error('Error querying payout:', payoutError);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    if (!payouts || payouts.length === 0) {
      console.warn('No payout found for reference_id:', payload.reference_id);
      // Return success to prevent webhook retries, but log the issue
      return NextResponse.json({ received: true });
    }

    const payout = payouts[0];

    // Map Xendit v2 status to our internal status
    const newStatus = XenditUtils.mapStatusToInternal(payload.status);

    // Only update if status has changed
    if (payout.status === newStatus) {
      console.log('Payout status unchanged, skipping update:', {
        payoutId: payout.id,
        currentStatus: payout.status,
        newStatus,
      });
      return NextResponse.json({ received: true });
    }

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      xendit_disbursement_id: payload.id, // Keep same field name for compatibility
      processed_at: payload.status === 'SUCCEEDED' ? new Date().toISOString() : payout.processed_at,
      // Note: failed_at field doesn't exist in our schema, removing it
      processing_notes: payload.status === 'SUCCEEDED' 
        ? `Payment completed successfully via ${payload.channel_code} on ${new Date().toLocaleString()}`
        : (payload.status === 'FAILED' || payload.status === 'CANCELLED')
        ? `Payment failed: ${payload.failure_code || 'Unknown error'} on ${new Date().toLocaleString()}`
        : null,
      updated_at: new Date().toISOString(),
    };

    // Update the payout status
    const { error: updateError } = await supabase
      .from('affiliate_payouts')
      .update(updateData)
      .eq('id', payout.id);

    if (updateError) {
      console.error('Error updating payout status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payout status' },
        { status: 500 }
      );
    }

    // Log the webhook processing
    console.log('Payout status updated via webhook:', {
      payoutId: payout.id,
      previousStatus: payout.status,
      newStatus,
      xenditId: payload.id,
      referenceId: payload.reference_id,
      amount: payload.amount,
      channelCode: payload.channel_code,
    });

    // If the payout was completed, update related conversion statuses
    if (payload.status === 'SUCCEEDED') {
      try {
        // Get payout items (conversions) for this payout
        const { data: payoutItems, error: itemsError } = await supabase
          .from('payout_items')
          .select('conversion_id')
          .eq('payout_id', payout.id);

        if (!itemsError && payoutItems && payoutItems.length > 0) {
          const conversionIds = payoutItems
            .filter((item: { conversion_id: string | null }) => item.conversion_id !== null)
            .map((item: { conversion_id: string | null }) => item.conversion_id as string);

          // Update conversion statuses to 'paid'
          const { error: conversionUpdateError } = await supabase
            .from('affiliate_conversions')
            .update({
              status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .in('id', conversionIds);

          if (conversionUpdateError) {
            console.error('Error updating conversion statuses:', conversionUpdateError);
          } else {
            console.log(`Updated ${conversionIds.length} conversions to 'paid' status`);
          }
        }
      } catch (conversionError) {
        console.error('Error updating conversion statuses:', conversionError);
        // Don't fail the webhook for conversion update errors
      }
    }

    console.log('Successfully processed Xendit payout webhook (v2):', {
      payoutId: payout.id,
      previousStatus: payout.status,
      newStatus,
      xenditId: payload.id,
    });

    return NextResponse.json({
      received: true,
      payout_id: payout.id,
      status_updated: newStatus,
    });

  } catch (error) {
    console.error('Error processing Xendit payout webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'xendit-payout-webhook',
    version: '2.0',
    timestamp: new Date().toISOString(),
  });
} 