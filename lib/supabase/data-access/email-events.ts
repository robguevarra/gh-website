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

  const { data, count, error } = await query;
  if (error) throw error;
  return { events: data as EmailEvent[], total: count || 0 };
}
