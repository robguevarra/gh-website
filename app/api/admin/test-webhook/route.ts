import { NextRequest, NextResponse } from 'next/server';

/**
 * Test Webhook Endpoint
 * Simulates Xendit webhook calls for testing the payout webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const { payoutId, status = 'COMPLETED' } = await request.json();
    
    if (!payoutId) {
      return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });
    }

    // Simulate Xendit webhook payload
    const webhookPayload = {
      id: `disbursement_${Date.now()}`, // Simulated Xendit disbursement ID
      external_id: payoutId, // Our payout ID
      status: status, // COMPLETED, FAILED, or PENDING
      amount: 1500,
      channel_code: 'PH_BDO',
      currency: 'PHP',
      failure_code: status === 'FAILED' ? 'INSUFFICIENT_BALANCE' : null,
      failure_reason: status === 'FAILED' ? 'Insufficient balance in your account' : null,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      account_holder_name: 'Test User',
      bank_code: 'BDO',
      bank_account_number: '1234567890'
    };

    // Call our webhook endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/xendit-payout`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-callback-token': process.env.XENDIT_WEBHOOK_TOKEN || 'test-token'
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.json();

    return NextResponse.json({
      message: 'Test webhook sent successfully',
      webhook_payload: webhookPayload,
      webhook_response: result,
      webhook_status: response.status
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to send test webhook' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Xendit Webhook Test Endpoint',
    usage: 'POST with { "payoutId": "your-payout-id", "status": "COMPLETED|FAILED|PENDING" }',
    example: {
      payoutId: 'payout-123',
      status: 'COMPLETED'
    }
  });
} 