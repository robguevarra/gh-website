import { NextRequest, NextResponse } from 'next/server';
import { xenditPayoutService, XenditUtils } from '@/lib/services/xendit/disbursement-service';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { 
  sendPayoutProcessingEmail,
  sendPayoutSuccessEmail,
  sendPayoutFailedEmail 
} from '@/lib/services/email/payout-notification-service';

/**
 * Xendit Payouts Webhook Handler (v2 API)
 * 
 * This endpoint receives webhook notifications from Xendit when payout statuses change.
 * Updated to handle the new v2 Payouts API payload structure.
 */

interface XenditPayoutWebhookPayload {
  id: string;
  amount?: number;
  channel_code?: string;
  currency?: string;
  description?: string;
  reference_id?: string;
  status: 'ACCEPTED' | 'PENDING' | 'LOCKED' | 'CANCELLED' | 'SUCCEEDED' | 'FAILED' | 'COMPLETED';
  created: string;
  updated?: string;
  estimated_arrival_time?: string;
  business_id?: string;
  channel_properties?: {
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
  
  // Batch disbursement fields
  disbursements?: Array<{
    id: string;
    reference_id: string;
    status: string;
    amount: number;
    channel_code: string;
    account_number: string;
    account_holder_name: string;
  }>;
  total_disbursed_count?: number;
  total_disbursed_amount?: number;
  total_error_count?: number;
  total_error_amount?: number;
  approver_id?: string;
  approved_at?: string;
  total_uploaded_count?: number;
  reference?: string;
  user_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-callback-token') || '';
    
    // Verify webhook token for security (simple token comparison)
    const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;
    
    if (!expectedToken || signature !== expectedToken) {
      console.error('Invalid webhook token received:', { 
        expected: expectedToken, 
        received: signature,
        hasToken: !!expectedToken 
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let rawPayload: any;
    let payload: XenditPayoutWebhookPayload;
    try {
      rawPayload = JSON.parse(rawBody);
      
      // Extract the actual payout data from the webhook payload
      // Xendit sends data in this format: { event: "payout.succeeded", data: { id, reference_id, ... } }
      if (rawPayload.data && rawPayload.event) {
        // Real Xendit webhook format
        payload = rawPayload.data;
        console.log('Processing Xendit webhook event:', rawPayload.event);
      } else {
        // Direct payload format (for testing)
        payload = rawPayload;
      }
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Check if this is a batch disbursement or single payout
    const isBatchDisbursement = payload.disbursements && Array.isArray(payload.disbursements);
    
    if (isBatchDisbursement) {
      console.log('Processing batch disbursement webhook:', {
        batchId: payload.id,
        status: payload.status,
        totalCount: payload.total_disbursed_count,
        totalAmount: payload.total_disbursed_amount
      });
      
      // For batch disbursements, we need to process each individual disbursement
      // Return success for now - batch processing can be implemented later if needed
      return NextResponse.json({
        received: true,
        type: 'batch_disbursement',
        batch_id: payload.id,
        processed_count: payload.total_disbursed_count || 0
      });
    }
    
    // Validate required fields for single payout webhooks
    if (!payload.id || !payload.reference_id || !payload.status) {
      console.error('Missing required fields in single payout webhook payload:', {
        rawPayload,
        extractedPayload: payload,
        hasId: !!payload.id,
        hasReferenceId: !!payload.reference_id,
        hasStatus: !!payload.status
      });
      return NextResponse.json(
        { error: 'Missing required fields for single payout' },
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

    // Find the payout record - try multiple strategies
    let payouts: any[] | null = null;
    let payoutError: any = null;

    // Strategy 1: Try by metadata payout_id first (most reliable)
    if (payload.metadata?.payout_id) {
      console.log('Searching payout by metadata payout_id:', payload.metadata.payout_id);
      const result = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('id', payload.metadata.payout_id);
      
      payouts = result.data;
      payoutError = result.error;
    }

    // Strategy 2: If not found, try by reference_id
    if ((!payouts || payouts.length === 0) && !payoutError) {
      console.log('Searching payout by reference:', payload.reference_id);
      const result = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('reference', payload.reference_id);
      
      payouts = result.data;
      payoutError = result.error;
    }

    // Strategy 3: If still not found, try by xendit_disbursement_id
    if ((!payouts || payouts.length === 0) && !payoutError) {
      console.log('Searching payout by xendit_disbursement_id:', payload.id);
      const result = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('xendit_disbursement_id', payload.id);
      
      payouts = result.data;
      payoutError = result.error;
    }

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

    // --- Send Payout Status Email Notifications ---
    try {
      console.log(`[Webhook][Payout] Sending ${newStatus} email notification for payout: ${payout.id}`);
      
      let emailSent = false;
      switch (newStatus) {
        case 'processing':
          emailSent = await sendPayoutProcessingEmail(payout.id);
          break;
        case 'paid':
          emailSent = await sendPayoutSuccessEmail(payout.id);
          break;
        case 'failed':
          emailSent = await sendPayoutFailedEmail(payout.id);
          break;
        default:
          console.log(`[Webhook][Payout] No email template for status: ${newStatus}`);
      }
      
      if (emailSent) {
        console.log(`[Webhook][Payout] ✅ ${newStatus} email sent successfully for payout: ${payout.id}`);
      } else {
        console.log(`[Webhook][Payout] ⚠️ ${newStatus} email failed to send for payout: ${payout.id}`);
      }
    } catch (emailError) {
      console.error(`[Webhook][Payout] ❌ Error sending ${newStatus} email for payout ${payout.id}:`, emailError);
      // Don't fail the webhook for email errors - payment processing is more important
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