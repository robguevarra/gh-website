// scripts/etl_postmark_to_email_events.ts
// Background job: Normalize postmark_events into email_events
// Run periodically (e.g., via cron or Taskfile)

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Map Postmark record_type to our event_type enum
 */
function mapRecordType(recordType: string): string | null {
  switch (recordType) {
    case 'Delivery': return 'delivered';
    case 'Open': return 'opened';
    case 'Click': return 'clicked';
    case 'Bounce': return 'bounced';
    case 'SpamComplaint': return 'spam';
    case 'SubscriptionChange': return 'unsubscribed';
    default: return null;
  }
}

async function runETL() {
  const supabase = createServerSupabaseClient();

  // Fetch unprocessed postmark_events (not yet in email_events)
  // We'll use message_id + record_type + timestamp as a unique key
  const { data: postmarkEvents, error } = await supabase
    .from('postmark_events')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch postmark_events:', error);
    process.exit(1);
  }

  for (const event of postmarkEvents) {
    const { record_type, message_id, payload, created_at } = event;
    const eventType = mapRecordType(record_type);
    if (!eventType) continue;

    // Extract recipient and user_id (if possible)
    const recipient = payload?.recipient || payload?.Recipient || null;
    let userId: string | null = null;
    if (payload?.user_id) {
      userId = payload.user_id;
    } else if (recipient) {
      // Optionally: lookup user_id by email
      const { data: user } = await supabase
        .from('unified_profiles')
        .select('id')
        .eq('email', recipient.toLowerCase())
        .maybeSingle();
      userId = user?.id || null;
    }

    // Check for existing event to avoid duplicates
    const { count: existing } = await supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .eq('message_id', message_id)
      .eq('event_type', eventType)
      .eq('timestamp', created_at);
    if ((existing ?? 0) > 0) continue;

    // Insert normalized event
    await supabase.from('email_events').insert({
      user_id: userId,
      email_id: null, // Optionally map if you have a sent_emails table
      event_type: eventType,
      timestamp: created_at,
      metadata: payload,
      message_id,
      recipient,
      campaign_id: null, // Optionally map if you have campaigns
      created_at,
      updated_at: new Date().toISOString(),
    });
  }

  console.log('ETL complete.');
}

runETL().catch((err) => {
  console.error('ETL job failed:', err);
  process.exit(1);
});
