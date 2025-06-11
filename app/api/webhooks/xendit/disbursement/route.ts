import { NextRequest, NextResponse } from 'next/server';
import { xenditDisbursementService, XenditUtils } from '@/lib/services/xendit/disbursement-service';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Xendit Disbursement Webhook Handler
 * 
 * This endpoint receives webhook notifications from Xendit when disbursement statuses change.
 * It updates our payout records accordingly and maintains audit trails.
 */

interface XenditWebhookPayload {
  id: string;
  user_id: string;
  external_id: string;
  amount: number;
  bank_code: string;
  account_holder_name: string;
  disbursement_description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  updated: string;
  created: string;
  failure_code?: string;
  email_to?: string[];
  email_cc?: string[];
  email_bcc?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-callback-token') || '';
    
    // Verify webhook signature for security
    const isValidSignature = xenditDisbursementService.verifyWebhookSignature(rawBody, signature);
    
    if (!isValidSignature) {
      console.error('Invalid webhook signature received');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let payload: XenditWebhookPayload;
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
    if (!payload.id || !payload.external_id || !payload.status) {
      console.error('Missing required fields in webhook payload:', payload);
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Processing Xendit disbursement webhook:', {
      id: payload.id,
      external_id: payload.external_id,
      status: payload.status,
      amount: payload.amount,
    });

    // Initialize Supabase client
    const supabase = await createServiceRoleClient();

    // Find the payout record by external_id
    // The external_id should match our payout reference or follow pattern "payout_{id}"
    let payoutQuery = supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('reference', payload.external_id);

    // If not found by reference, try extracting payout ID from external_id
    if (payload.external_id.startsWith('payout_')) {
      const payoutIdMatch = payload.external_id.match(/payout_(\d+)/);
      if (payoutIdMatch) {
        payoutQuery = payoutQuery.or(`id.eq.${payoutIdMatch[1]}`);
      }
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
      console.warn('No payout found for external_id:', payload.external_id);
      // Return success to prevent webhook retries, but log the issue
      return NextResponse.json({ received: true });
    }

    const payout = payouts[0];

    // Map Xendit status to our internal status
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
      xendit_disbursement_id: payload.id,
      processed_at: payload.status === 'COMPLETED' ? new Date().toISOString() : payout.processed_at,
      failed_at: payload.status === 'FAILED' ? new Date().toISOString() : null,
      failure_reason: payload.failure_code || null,
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
      externalId: payload.external_id,
      amount: payload.amount,
    });

    // If the disbursement was completed, update related conversion statuses
    if (payload.status === 'COMPLETED') {
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

    console.log('Successfully processed Xendit disbursement webhook:', {
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
    console.error('Unexpected error in Xendit webhook handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification (if needed by Xendit)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ 
    status: 'Xendit disbursement webhook endpoint',
    timestamp: new Date().toISOString(),
  });
} 