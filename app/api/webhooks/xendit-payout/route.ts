import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Note: logAdminActivity import will be added when admin-actions is available

// Initialize Supabase client with service role key for webhook operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Xendit Payout Webhook Handler
 * Handles status updates for disbursements sent via Xendit
 * 
 * Webhook Events:
 * - DISBURSEMENT_COMPLETED: Payment successfully sent to recipient
 * - DISBURSEMENT_FAILED: Payment failed (insufficient balance, invalid account, etc.)
 * - DISBURSEMENT_PENDING: Payment is being processed
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity (Xendit sends a signature header)
    const signature = request.headers.get('x-callback-token');
    const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;
    
    // Temporarily log for debugging
    console.log('Webhook auth check:', {
      signature,
      expectedToken,
      hasToken: !!expectedToken,
      match: signature === expectedToken
    });
    
    if (!expectedToken || signature !== expectedToken) {
      console.error('Invalid webhook signature - Expected:', expectedToken, 'Got:', signature);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    console.log('Xendit webhook received:', JSON.stringify(payload, null, 2));

    // Extract key information from Xendit webhook
    // Handle both test format and real Xendit format
    let xenditDisbursementId, externalId, status, amount, channel_code, failure_code, failure_reason, created, updated;
    
    if (payload.event && payload.data) {
      // Real Xendit webhook format
      const data = payload.data;
      xenditDisbursementId = data.id;
      externalId = data.reference_id; // Xendit uses reference_id as our external identifier
      status = data.status; // SUCCEEDED, FAILED, etc.
      amount = data.amount;
      channel_code = data.channel_code;
      failure_code = data.failure_code;
      failure_reason = data.failure_reason;
      created = data.created;
      updated = data.updated;
    } else {
      // Test/legacy format
      xenditDisbursementId = payload.id;
      externalId = payload.external_id;
      status = payload.status;
      amount = payload.amount;
      channel_code = payload.channel_code;
      failure_code = payload.failure_code;
      failure_reason = payload.failure_reason;
      created = payload.created;
      updated = payload.updated;
    }

    // Find the payout record using the external_id (which should be our payout ID)
    const { data: payout, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .select('id, affiliate_id, amount, status')
      .eq('id', externalId)
      .single();

    if (payoutError || !payout) {
      console.log('Payout not found for external_id:', externalId, '- This may be a test payout or payout created outside our system');
      
      // Log the webhook for audit purposes even if we don't have the payout
      console.log('External payout webhook logged:', {
        xendit_id: xenditDisbursementId,
        external_id: externalId,
        status: status,
        amount: amount,
        channel: channel_code,
        event_type: payload.event || 'legacy',
        webhook_timestamp: new Date().toISOString()
      });
      
      // Return success to prevent Xendit from retrying
      return NextResponse.json({ 
        message: 'Webhook received - payout not in our system',
        external_id: externalId,
        xendit_id: xenditDisbursementId,
        status: 'acknowledged'
      }, { status: 200 });
    }

    // Map Xendit status to our internal status
    let newStatus: string;
    let processingNotes: string;

    switch (status) {
      case 'COMPLETED':
      case 'SUCCEEDED':
        newStatus = 'paid';
        processingNotes = `Payment completed successfully via ${channel_code} on ${new Date(updated).toLocaleString()}`;
        break;
      
      case 'FAILED':
        newStatus = 'failed';
        processingNotes = `Payment failed: ${failure_reason || failure_code || 'Unknown error'} on ${new Date(updated).toLocaleString()}`;
        break;
      
      case 'PENDING':
      case 'PROCESSING':
        newStatus = 'processing';
        processingNotes = `Payment is being processed via ${channel_code} since ${new Date(created).toLocaleString()}`;
        break;
      
      default:
        console.log('Unknown Xendit status:', status);
        return NextResponse.json({ message: 'Status not handled' }, { status: 200 });
    }

    // Update the payout record with new status and Xendit information
    const { error: updateError } = await supabase
      .from('affiliate_payouts')
      .update({
        status: newStatus,
        xendit_disbursement_id: xenditDisbursementId,
        processing_notes: processingNotes,
        processed_at: (status === 'COMPLETED' || status === 'SUCCEEDED') ? new Date(updated).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', payout.id);

    if (updateError) {
      console.error('Failed to update payout:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // If payment failed, we need to rollback the conversions to unpaid status
    if (status === 'FAILED') {
      const { error: rollbackError } = await supabase
        .from('affiliate_conversions')
        .update({
          paid_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('affiliate_id', payout.affiliate_id)
        .not('paid_at', 'is', null); // Only update conversions that were marked as paid

      if (rollbackError) {
        console.error('Failed to rollback conversions:', rollbackError);
        // Continue processing - this is not critical enough to fail the webhook
      }
    }

    // Log the webhook activity for audit purposes
    console.log('Webhook activity logged:', {
      payout_id: payout.id,
      affiliate_id: payout.affiliate_id,
      xendit_id: xenditDisbursementId,
      status: status,
      amount: amount,
      channel: channel_code,
      failure_reason: failure_reason,
      webhook_timestamp: new Date().toISOString()
    });

    console.log(`Payout ${payout.id} status updated to ${newStatus}`);
    
    return NextResponse.json({ 
      message: 'Webhook processed successfully',
      payout_id: payout.id,
      new_status: newStatus
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ 
    message: 'Xendit Payout Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  });
} 