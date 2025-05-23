// lib/supabase/data-access/email-events.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type EmailEventType = 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam' | 'unsubscribed';

export interface EmailEvent {
  id: string;
  user_id: string | null;
  email_id: string | null;
  event_type: EmailEventType;
  timestamp: string;
  message_id?: string;
  recipient: string;
  campaign_id?: string | null;
  campaign_name?: string;
  campaign_subject?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GetUserEmailEventsFilters {
  eventType?: EmailEventType | EmailEventType[];
  dateFrom?: string;
  dateTo?: string;
  campaignId?: string;
  limit?: number;
  offset?: number;
}

export async function getUserEmailEvents(
  userId: string,
  filters: GetUserEmailEventsFilters = {}
): Promise<{ events: EmailEvent[]; total: number }> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from('email_events')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (filters.eventType) {
    if (Array.isArray(filters.eventType)) {
      query = query.in('event_type', filters.eventType);
    } else {
      query = query.eq('event_type', filters.eventType);
    }
  }
  if (filters.dateFrom) {
    query = query.gte('timestamp', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('timestamp', filters.dateTo);
  }
  if (filters.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
  }

  const { data: emailEventsData, count, error: emailEventsError } = await query;
  if (emailEventsError) throw emailEventsError;

  if (!emailEventsData || emailEventsData.length === 0) {
    return { events: [], total: 0 };
  }

  // Extract unique campaign IDs from the fetched events
  const campaignIds = [
    ...new Set(emailEventsData.map(event => event.campaign_id).filter(id => id !== null && id !== undefined) as string[])
  ];

  let augmentedEvents = [...emailEventsData] as EmailEvent[];

  // If there are campaign IDs, fetch campaign details and augment the events
  if (campaignIds.length > 0) {
    const { data: campaignDetailsData, error: campaignDetailsError } = await supabase
      .from('email_campaigns')
      .select('id, name, subject')
      .in('id', campaignIds);

    if (campaignDetailsError) {
      console.error('Error fetching campaign details:', campaignDetailsError);
      // Proceed with events without campaign details if this fails
    } else if (campaignDetailsData) {
      const campaignDetailsMap: Record<string, { name: string; subject: string }> = {};
      const validCampaignDetails = campaignDetailsData.filter(detail => typeof detail.id === 'string');
      
      for (const detail of validCampaignDetails) {
        // After the filter, detail.id is known to be a string.
        campaignDetailsMap[detail.id] = { name: detail.name, subject: detail.subject };
      }

      augmentedEvents = emailEventsData.map(event => {
        const campaignDetails = event.campaign_id ? campaignDetailsMap[event.campaign_id] : null;
        return {
          ...event,
          campaign_name: campaignDetails?.name,
          campaign_subject: campaignDetails?.subject,
        } as EmailEvent;
      });
    }
  }

  return { events: augmentedEvents, total: count || 0 };
}
