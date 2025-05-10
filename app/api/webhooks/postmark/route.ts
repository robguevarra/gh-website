 import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// --- Postmark Webhook Event Types ---
// Reference: https://postmarkapp.com/developer/webhooks/overview

type PostmarkWebhookType =
  | 'Delivery'
  | 'Bounce'
  | 'Open'
  | 'Click'
  | 'SpamComplaint'
  | 'SubscriptionChange'
  | 'Inbound';

interface PostmarkBaseEvent {
  RecordType: PostmarkWebhookType;
  MessageID?: string;
  [key: string]: any;
}

// --- Handler Functions ---

async function storePostmarkEvent({ event, supabase }: { event: PostmarkBaseEvent; supabase: any }) {
  // Store event in supabase (table: postmark_events)
  // Table should have: id, record_type, message_id, payload, created_at
  const { error } = await supabase.from('postmark_events').insert({
    record_type: event.RecordType,
    message_id: event.MessageID || null,
    payload: event,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[Postmark Webhook] Error storing event:', error, event);
    return { hasError: true, error };
  }
  return { hasError: false };
}

function getEventType(event: PostmarkBaseEvent): PostmarkWebhookType | null {
  return typeof event.RecordType === 'string' ? event.RecordType : null;
}

// --- Main Webhook Handler ---
export async function POST(req: NextRequest) {
  const supabase = getAdminClient();
  try {
    const event: PostmarkBaseEvent = await req.json();
    const eventType = getEventType(event);
    if (!eventType) {
      console.error('[Postmark Webhook] Missing or invalid RecordType:', event);
      return NextResponse.json({ error: 'Invalid RecordType' }, { status: 400 });
    }
    // Log received event
    console.info(`[Postmark Webhook] Received ${eventType} event`, {
      message_id: event.MessageID,
      event,
    });
    // Store event
    const { hasError, error } = await storePostmarkEvent({ event, supabase });
    if (hasError) {
      return NextResponse.json({ error: 'Failed to store event' }, { status: 500 });
    }
    // Handle event-specific logic (extend as needed)
    switch (eventType) {
      case 'Delivery':
        // Delivery event: mark as delivered, update analytics
        break;
      case 'Bounce':
        // Bounce event: update bounce analytics, flag user/email
        break;
      case 'Open':
        // Open event: update open analytics
        break;
      case 'Click':
        // Click event: update click analytics
        break;
      case 'SpamComplaint':
        // Spam complaint: flag/report user/email
        break;
      case 'SubscriptionChange':
        // Subscription change: update user preferences
        break;
      case 'Inbound':
        // Inbound: process inbound email if needed
        break;
      default:
        // Unknown event type
        console.warn('[Postmark Webhook] Unhandled event type:', eventType);
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Postmark Webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}

// Optional: Export config if raw body access is needed (not required for Postmark)