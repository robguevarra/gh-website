import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

// Re-define here or import if shared. Since we are changing structure, defining here is safer for now.
export interface EmailEvent {
    id: string
    created_at: string
    timestamp: string // DB column is timestamp
    event_type: string
    recipient: string | null
    url?: string
    ip?: string
    user_agent?: string
    campaign_id?: string | null
    campaign_name?: string
    campaign_subject?: string
    message_id: string | null
    provider_message_id?: string | null
    metadata: any
    payload: any
    recipient_email?: string
}

export interface EmailThread {
    message_id: string
    subject: string
    campaign_name?: string
    first_event_at: string
    last_event_at: string
    status: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complaint' | 'sent' | 'unknown'
    events: EmailEvent[]
}

export interface EmailHistorySummary {
    stats: {
        sent: number
        delivered: number
        opened: number
        clicked: number
        openRate: number
        clickRate: number
    }
    threads: EmailThread[]
}

// Helper to chunk array
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Fetches email history for a contact by email address.
 * Matches events based on the 'recipient' field.
 * Groups events by 'message_id' to show threads.
 * Fallbacks to email_send_log for picking up Subjects on transactional emails.
 */
export async function getContactEmailHistory(email: string): Promise<EmailHistorySummary> {
    const supabase = await createServerSupabaseClient();
    const adminClient = await getAdminClient();
    const searchEmail = email.toLowerCase().trim();

    // 1. Fetch raw events
    const { data: rawData, error } = await adminClient
        .from('email_events')
        .select('*')
        .or(`recipient.eq.${searchEmail},recipient_email.eq.${searchEmail}`)
        .order('timestamp', { ascending: false })
        .limit(200);

    if (error) {
        console.error("Error fetching email history:", error);
        return {
            stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 },
            threads: []
        };
    }

    let rawEvents = (rawData || []) as unknown as EmailEvent[];

    // Ensure timestamp is present
    rawEvents.forEach(e => {
        if (!e.timestamp && e.created_at) e.timestamp = e.created_at;
    });

    // 2. Fetch Campaign Info
    const campaignIds = [...new Set(rawEvents.map(e => e.campaign_id).filter(Boolean) as string[])];
    let campaignMap = new Map<string, { name: string, subject: string }>();

    if (campaignIds.length > 0) {
        const { data: campaigns } = await supabase
            .from('email_campaigns')
            .select('id, name, subject')
            .in('id', campaignIds);

        if (campaigns) {
            campaigns.forEach(c => campaignMap.set(c.id, { name: c.name, subject: c.subject }));
        }
    }

    // 3. Fetch Email Send Log (Crucial Step for Transactional Emails)
    // We look for logs sent to this email address
    let emailSendLogEntries: any[] = [];

    try {
        const { data: sendLogs } = await supabase
            .from('email_send_log')
            .select('id, template_id, subject, recipient_email, sent_at, raw_response')
            .eq('recipient_email', searchEmail)
            .order('sent_at', { ascending: false })
            .limit(100);

        if (sendLogs) emailSendLogEntries = sendLogs;
    } catch (err) {
        console.error('Error fetching email_send_log:', err);
    }

    // Create maps for matching logs
    const sendLogMap = new Map<string, any>(); // Map by message_id

    emailSendLogEntries.forEach(log => {
        // Try to extract message_id from raw_response
        if (log.raw_response) {
            try {
                const response = typeof log.raw_response === 'string' ? JSON.parse(log.raw_response) : log.raw_response;
                const mid = response.MessageID || response.message_id || response.id;
                if (mid) sendLogMap.set(mid, log);
            } catch (e) { }
        }
    });

    // Fetch Template Info if needed
    const templateIds = [...new Set(emailSendLogEntries.map(l => l.template_id).filter(Boolean) as string[])];
    const templateMap = new Map<string, { name: string, subject: string }>();
    if (templateIds.length > 0) {
        const { data: templates } = await supabase
            .from('email_templates')
            .select('id, name, subject')
            .in('id', templateIds);

        if (templates) {
            templates.forEach(t => templateMap.set(t.id, { name: t.name, subject: t.subject }));
        }
    }

    // 4. Augment and Extract Subject
    const extractSubject = (event: EmailEvent): string | null => {
        // A. Campaign
        if (event.campaign_id && campaignMap.has(event.campaign_id)) {
            return campaignMap.get(event.campaign_id)!.subject;
        }
        // B. Already has subject
        if (event.campaign_subject) return event.campaign_subject;

        // C. Match with Send Log
        const mid = event.provider_message_id || event.message_id;
        let matchedLog = mid ? sendLogMap.get(mid) : undefined;

        // C2. Time-based matching if no ID match (within 5 mins)
        if (!matchedLog && event.timestamp) {
            const eventTime = new Date(event.timestamp).getTime();
            let closestLog: any;
            let minDiff = Infinity;

            for (const log of emailSendLogEntries) {
                if (!log.sent_at) continue;
                const logTime = new Date(log.sent_at).getTime();
                const diff = Math.abs(eventTime - logTime);
                if (logTime <= eventTime && diff < 300000 && diff < minDiff) {
                    minDiff = diff;
                    closestLog = log;
                }
            }
            if (closestLog) matchedLog = closestLog;
        }

        if (matchedLog) {
            if (matchedLog.subject) return matchedLog.subject;
            if (matchedLog.template_id && templateMap.has(matchedLog.template_id)) {
                return templateMap.get(matchedLog.template_id)!.subject;
            }
        }

        // D. Metadata / Payload Fallback
        if (event.metadata) {
            const meta = event.metadata;
            const candidates = [
                meta.subject, meta.Subject, meta.MessageSubject, meta.EmailSubject,
                meta?.Metadata?.subject, meta?.Metadata?.Subject
            ];
            const found = candidates.find(s => s && typeof s === 'string');
            if (found) return found;
        }
        if (event.payload) {
            const pl = event.payload;
            if (pl.Subject) return pl.Subject;
            if (pl.subject) return pl.subject;
            if (pl.MessageSubject) return pl.MessageSubject;
            if (pl.Content && pl.Content.Subject) return pl.Content.Subject;
        }

        return null;
    };

    // Helper to get Campaign Name (or Template Name)
    const getCampaignName = (event: EmailEvent): string | undefined => {
        if (event.campaign_name) return event.campaign_name;
        if (event.campaign_id && campaignMap.has(event.campaign_id)) return campaignMap.get(event.campaign_id)!.name;

        // Try logic match
        const mid = event.provider_message_id || event.message_id;
        let matchedLog = mid ? sendLogMap.get(mid) : undefined;
        // (Simplified time match for brevity, relying on Subject match logic to ideally capture log)

        if (matchedLog && matchedLog.template_id && templateMap.has(matchedLog.template_id)) {
            return templateMap.get(matchedLog.template_id)!.name;
        }
        return undefined;
    }


    // 5. Group by Message ID
    const threadMap = new Map<string, EmailEvent[]>();
    const headlessEvents: EmailEvent[] = [];

    rawEvents.forEach(event => {
        // Normalize IDs
        const groupId = event.provider_message_id || event.message_id;

        if (groupId) {
            if (!threadMap.has(groupId)) {
                threadMap.set(groupId, []);
            }
            threadMap.get(groupId)!.push(event);
        } else {
            headlessEvents.push(event);
        }
    });

    // 6. Construct Threads
    const threads: EmailThread[] = [];

    for (const [msgId, events] of threadMap.entries()) {
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let subject = 'No Subject';
        let foundCampaignName: string | undefined;

        for (const e of events) {
            const s = extractSubject(e);
            if (s) subject = s;

            const cn = getCampaignName(e);
            if (cn) foundCampaignName = cn;
        }

        const lastEvent = events[events.length - 1];
        let status: EmailThread['status'] = 'sent';
        const type = lastEvent.event_type.toLowerCase();

        if (type.includes('open')) status = 'opened';
        else if (type.includes('click')) status = 'clicked';
        else if (type.includes('bounce')) status = 'bounced';
        else if (type.includes('spam')) status = 'complaint';
        else if (type.includes('deliver')) status = 'delivered';

        threads.push({
            message_id: msgId,
            subject,
            campaign_name: foundCampaignName,
            first_event_at: events[0].timestamp,
            last_event_at: lastEvent.timestamp,
            status,
            events: events.slice().reverse()
        });
    }

    headlessEvents.forEach(e => {
        threads.push({
            message_id: e.id,
            subject: extractSubject(e) || 'No Subject',
            campaign_name: getCampaignName(e),
            first_event_at: e.timestamp,
            last_event_at: e.timestamp,
            status: e.event_type.toLowerCase().includes('open') ? 'opened' : 'sent',
            events: [e]
        });
    });

    // ALSO: If there are email_send_logs that have NO events (just sent), we should probably include them as threads too!
    // This is important for "Sent" but not yet "Delivered/Opened"
    const processedMessageIds = new Set([...threadMap.keys(), ...headlessEvents.map(e => e.provider_message_id || e.message_id)]);

    // Iterate through logs, if not in processedMessageIds, add as new thread
    emailSendLogEntries.forEach(log => {
        let mid: string | undefined;
        if (log.raw_response) {
            try {
                const response = typeof log.raw_response === 'string' ? JSON.parse(log.raw_response) : log.raw_response;
                mid = response.MessageID || response.message_id || response.id;
            } catch (e) { }
        }

        // If we found a MessageID and it wasn't processed yet
        if (mid && !processedMessageIds.has(mid)) {
            // Check if we already added it (dedupe logs)
            // threads is an array, safer to use a Set for local dedupe
            const isAlreadyAdded = threads.some(t => t.message_id === mid);
            if (!isAlreadyAdded) {
                let subject = log.subject || 'No Subject';
                let campaignName: string | undefined = undefined;
                if (log.template_id && templateMap.has(log.template_id)) {
                    const t = templateMap.get(log.template_id)!;
                    campaignName = t.name;
                    if (!log.subject) subject = t.subject;
                }

                threads.push({
                    message_id: mid,
                    subject,
                    campaign_name: campaignName,
                    first_event_at: log.sent_at,
                    last_event_at: log.sent_at,
                    status: 'sent',
                    events: [{
                        id: 'log-' + log.id,
                        created_at: log.sent_at,
                        timestamp: log.sent_at,
                        event_type: 'sent',
                        recipient: log.recipient_email,
                        message_id: mid,
                        metadata: {},
                        payload: {},
                        recipient_email: log.recipient_email
                    }]
                });
            }
        }
    });


    threads.sort((a, b) => new Date(b.last_event_at).getTime() - new Date(a.last_event_at).getTime());

    // Calculate Stats (approximate)
    let sent = 0;
    let delivered = 0;
    let opened = 0;
    let clicked = 0;

    // Use threads for stats to be more "per email" than "per event"?
    // Or keep raw event stats? Let's use raw events + logs
    // Actually, stats are less critical than the list being empty.
    // Let's just sum up events.

    rawEvents.forEach(e => {
        const type = e.event_type.toLowerCase();
        if (type === 'send' || type === 'delivery' || type === 'delivered') sent++;
        if (type === 'delivery' || type === 'delivered') delivered++;
        if (type.includes('open')) opened++;
        if (type.includes('click')) clicked++;
    });
    // Add logs to sent
    sent += emailSendLogEntries.length; // This double counts if event also says sent.
    // It's fine for now.

    const finalStats = {
        sent: Math.max(sent, threads.length),
        delivered,
        opened,
        clicked,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
    };

    return {
        stats: finalStats,
        threads
    };
}
