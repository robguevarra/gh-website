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
  Recipient?: string; // For bounce/spam to update unified_profiles
  [key: string]: any;
}

// --- Handler Functions ---

// async function storePostmarkEvent({ event, supabase }: { event: PostmarkBaseEvent; supabase: any }) {
//   // Store event in supabase (table: postmark_events)
//   // Table should have: id, record_type, message_id, payload, created_at
//   const { error } = await supabase.from('postmark_events').insert({
//     record_type: event.RecordType,
//     message_id: event.MessageID || null,
//     payload: event,
//     created_at: new Date().toISOString(),
//   });
//   if (error) {
//     console.error('[Postmark Webhook] Error storing raw event:', error, event);
//     // Don't return error here, allow main logic to proceed if possible
//   }
//   return { hasError: false }; // Assume raw logging is best-effort
// }

async function processAndStoreEmailEvent({
  event,
  linkedEmailInfo,
  supabase
}: {
  event: PostmarkBaseEvent;
  linkedEmailInfo: { email_id: string; campaign_id: string; recipient_email: string } | null;
  supabase: any;
}) {
  let userIdToStore: string | null = null;
  const recipientEmailForLookup = linkedEmailInfo?.recipient_email || event.Recipient;

  if (recipientEmailForLookup) {
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('unified_profiles')
        .select('id')
        .eq('email', recipientEmailForLookup)
        .single();

      if (profileError) {
        // Log error but don't let it block event storage if user not found or other DB issue
        console.warn(`[Postmark Webhook] Error fetching user_id for ${recipientEmailForLookup}:`, profileError.message);
      } else if (userProfile) {
        userIdToStore = userProfile.id;
        console.info(`[Postmark Webhook] Found user_id '${userIdToStore}' for email '${recipientEmailForLookup}'`);
      } else {
        console.info(`[Postmark Webhook] No user_id found for email '${recipientEmailForLookup}'`);
      }
    } catch (lookupError) {
      console.error(`[Postmark Webhook] Exception during user_id lookup for ${recipientEmailForLookup}:`, lookupError);
    }
  }

  const { error } = await supabase.from('email_events').insert({
    user_id: userIdToStore,
    email_id: linkedEmailInfo?.email_id || null,
    campaign_id: linkedEmailInfo?.campaign_id || null,
    recipient_email: linkedEmailInfo?.recipient_email || event.Recipient || null, // Store recipient if available
    event_type: event.RecordType,
    provider_message_id: event.MessageID || null,
    metadata: event, // Store the full Postmark event payload
    received_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[Postmark Webhook] Error storing processed email_event:', error, { event, linkedEmailInfo });
    return { success: false, error };
  }
  return { success: true };
}

function getEventType(event: PostmarkBaseEvent): PostmarkWebhookType | null {
  return typeof event.RecordType === 'string' ? event.RecordType : null;
}

// --- Main Webhook Handler ---
export async function POST(req: NextRequest) {
  const supabase = getAdminClient();
  let linkedEmailInfo: { email_id: string; campaign_id: string; recipient_email: string } | null = null;

  try {
    const event: PostmarkBaseEvent = await req.json();
    const eventType = getEventType(event);
    if (!eventType) {
      console.error('[Postmark Webhook] Missing or invalid RecordType:', event);
      return NextResponse.json({ error: 'Invalid RecordType' }, { status: 400 });
    }
    
    console.info(`[Postmark Webhook] Received ${eventType} event`, {
      message_id: event.MessageID,
      // event, // Avoid logging full event if too large or sensitive, MessageID is key
    });

    // Attempt to link event to email_queue entry via MessageID
    if (event.MessageID) {
      const { data: queueEntry, error: queueError } = await supabase
        .from('email_queue')
        .select('id, campaign_id, recipient_email')
        .eq('provider_message_id', event.MessageID)
        .single();
      
      if (queueError) {
        console.warn('[Postmark Webhook] Error fetching from email_queue by MessageID:', {
          messageId: event.MessageID,
          error: queueError.message,
        });
      } else if (queueEntry) {
        linkedEmailInfo = {
          email_id: queueEntry.id,
          campaign_id: queueEntry.campaign_id,
          recipient_email: queueEntry.recipient_email,
        };
        console.info('[Postmark Webhook] Linked event to email_queue item', { messageId: event.MessageID, emailQueueId: queueEntry.id, campaignId: queueEntry.campaign_id });
      } else {
        console.warn('[Postmark Webhook] No email_queue entry found for MessageID:', { messageId: event.MessageID });
      }
    }

    // Store the processed event (linked or unlinked)
    await processAndStoreEmailEvent({ event, linkedEmailInfo, supabase });
    
    // Handle event-specific logic only if we have campaign_id for analytics updates
    if (linkedEmailInfo?.campaign_id) {
      const campaignIdForAnalytics = linkedEmailInfo.campaign_id;
      let metricToIncrement: string | null = null;

      switch (eventType) {
        case 'Delivery':
          metricToIncrement = 'deliveries';
          break;
        case 'Bounce':
          metricToIncrement = 'bounces';
          if (linkedEmailInfo.recipient_email) {
            // Flag user as bounced
            const { error:BounceError } = await supabase
              .from('unified_profiles')
              .update({ email_bounced: true, email_last_bounce_at: new Date().toISOString() })
              .eq('email', linkedEmailInfo.recipient_email);
            if (BounceError) console.error('[Postmark Webhook] Error updating unified_profile for bounce:', BounceError);
            else console.info('Marked user as bounced:', {email: linkedEmailInfo.recipient_email});
          }
          break;
        case 'Open':
          metricToIncrement = 'opens';
          break;
        case 'Click':
          metricToIncrement = 'clicks';
          break;
        case 'SpamComplaint':
          metricToIncrement = 'spam_complaints';
           if (linkedEmailInfo.recipient_email) {
            // Consider more severe action for spam complaints, e.g., unsubscribe, add to blocklist
            const { error:SpamError } = await supabase
              .from('unified_profiles')
              .update({ email_spam_complained: true, email_last_spam_at: new Date().toISOString() }) // Assuming these columns exist
              .eq('email', linkedEmailInfo.recipient_email);
            if (SpamError) console.error('[Postmark Webhook] Error updating unified_profile for spam complaint:', SpamError);
            else console.info('Marked user for spam complaint:', {email: linkedEmailInfo.recipient_email});
          }
          break;
        case 'SubscriptionChange': // Postmark uses this for their own unsubscribe links
          // This might indicate an unsubscribe. Confirm Postmark payload details.
          // If it is an unsubscribe, then metricToIncrement = 'unsubscribes';
          // And update user preferences / unified_profile similar to bounce/spam.
          console.info('[Postmark Webhook] Received SubscriptionChange. Payload:', event); 
          // Example: if (event.SuppressSending) { metricToIncrement = 'unsubscribes'; ... }
          break;
        // Inbound is not typically for campaign analytics
        // case 'Inbound': 
        //   break;
        default:
          console.warn('[Postmark Webhook] Unhandled event type for analytics:', eventType);
          break;
      }

      if (metricToIncrement && campaignIdForAnalytics) {
        const { error: rpcError } = await supabase.rpc('increment_campaign_metric', {
          p_campaign_id: campaignIdForAnalytics,
          p_metric_name: metricToIncrement,
          p_increment_value: 1,
        });
        if (rpcError) {
          console.error('[Postmark Webhook] Error calling increment_campaign_metric RPC:', rpcError);
        } else {
          console.info(`[Postmark Webhook] Incremented ${metricToIncrement} for campaign ${campaignIdForAnalytics}`);
        }
      }
    } else if (eventType !== 'Inbound' && eventType !== 'SubscriptionChange') {
        console.warn('[Postmark Webhook] Cannot update campaign analytics as event was not linked to a campaign_id', { messageId: event.MessageID, eventType });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Postmark Webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}

// Optional: Export config if raw body access is needed (not required for Postmark)