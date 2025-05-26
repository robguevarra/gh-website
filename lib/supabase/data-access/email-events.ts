// lib/supabase/data-access/email-events.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Helper function to chunk array into smaller arrays
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Define interfaces for the database tables
interface EmailSendLogEntry {
  id: string;
  template_id?: string;
  recipient_email?: string;
  variables?: Record<string, any>;
  status?: string;
  sent_at?: string;
  error_message?: string;
  created_at?: string;
  email_content?: string;
  email_headers?: Record<string, any>;
  raw_response?: Record<string, any> | string;
  subject?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  html_content?: string;
  text_content?: string;
  variables?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export type EmailEventType = 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam' | 'unsubscribed';

export interface EmailEvent {
  id: string;
  user_id: string | null;
  email_id: string | null;
  event_type: EmailEventType;
  timestamp: string;
  message_id?: string;
  provider_message_id?: string; // Added provider_message_id field
  recipient: string;
  recipient_email?: string; // Added for consistency with db schema
  campaign_id?: string | null;
  campaign_name?: string;
  campaign_subject?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  payload?: Record<string, any>; // Added for consistency with db schema
  received_at?: string; // Added for consistency with db schema
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
    ...new Set(emailEventsData.map(event => event.campaign_id)
      .filter((id): id is string => id !== null && id !== undefined))
  ];

  // Extract unique provider message IDs and message IDs to lookup in email_send_log
  const messageIds = [
    ...new Set(
      emailEventsData
        .map(event => event.provider_message_id || event.message_id)
        .filter((id): id is string => id !== null && id !== undefined)
    )
  ];

  let augmentedEvents = [...emailEventsData] as EmailEvent[];

  // Step 1: First try to fetch campaign details for campaign emails
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
      const validCampaignDetails = campaignDetailsData.filter((detail): detail is EmailTemplate => 
        detail !== null && 
        typeof detail === 'object' && 
        typeof detail.id === 'string'
      );
      
      for (const detail of validCampaignDetails) {
        // After the filter, detail.id is known to be a string.
        campaignDetailsMap[detail.id] = { 
          name: detail.name || 'Unknown Campaign', 
          subject: detail.subject || 'No Subject' 
        };
      }

      augmentedEvents = emailEventsData.map(event => {
        // Handle potential null/undefined campaign_id
        const campaignId = typeof event.campaign_id === 'string' ? event.campaign_id : undefined;
        const campaignDetails = campaignId ? campaignDetailsMap[campaignId] : null;
        return {
          ...event,
          campaign_name: campaignDetails?.name,
          campaign_subject: campaignDetails?.subject,
        } as EmailEvent;
      });
    }
  }

  // Step 2: Fetch email_send_log data for transactional emails and any missing subjects
  if (messageIds.length > 0 || emailEventsData.length > 0) {
    // Due to the complexity of matching events to logs, use a different approach
    // We'll fetch recent send logs by recipient email addresses in the events
    const userEmails = [
      ...new Set(
        emailEventsData
          .map(event => event.recipient_email || event.recipient)
          .filter((email): email is string => email !== null && email !== undefined)
      )
    ];
    
    let emailSendLogEntries: EmailSendLogEntry[] = [];
    
    try {
      // Get email_send_log entries by recipient email
      if (userEmails.length > 0) {
        for (const batchEmails of chunkArray(userEmails, 10)) { // Process in batches to avoid query size limits
          const { data: sendLogData, error: sendLogError } = await supabase
            .from('email_send_log')
            .select('id, template_id, subject, recipient_email, sent_at, raw_response')
            .in('recipient_email', batchEmails)
            .order('sent_at', { ascending: false })
            .limit(100) as unknown as { data: EmailSendLogEntry[] | null, error: any };
            
          if (sendLogError) {
            console.error('Error fetching email_send_log by recipient:', sendLogError);
          } else if (sendLogData && sendLogData.length > 0) {
            emailSendLogEntries = [...emailSendLogEntries, ...sendLogData];
          }
        }
      }
      
      // If we didn't get enough data, also try by date range
      if (emailSendLogEntries.length < emailEventsData.length) {
        // Find the oldest event timestamp to use as a date filter
        const oldestEventDate = emailEventsData
          .map(event => new Date(event.timestamp).getTime())
          .reduce((oldest, current) => Math.min(oldest, current), Date.now());
          
        const oldestDate = new Date(oldestEventDate - 1000 * 60 * 60); // 1 hour before oldest event
        
        const { data: additionalLogs, error: dateRangeError } = await supabase
          .from('email_send_log')
          .select('id, template_id, subject, recipient_email, sent_at, raw_response')
          .gte('sent_at', oldestDate.toISOString())
          .order('sent_at', { ascending: false })
          .limit(200) as unknown as { data: EmailSendLogEntry[] | null, error: any };
          
        if (dateRangeError) {
          console.error('Error fetching email_send_log by date range:', dateRangeError);
        } else if (additionalLogs && additionalLogs.length > 0) {
          // Filter out duplicates before adding
          const existingIds = new Set(emailSendLogEntries.map(entry => entry.id));
          const newLogs = additionalLogs.filter(log => !existingIds.has(log.id));
          emailSendLogEntries = [...emailSendLogEntries, ...newLogs];
        }
      }
    } catch (err) {
      console.error('Error fetching email_send_log data:', err);
    }

    // Continue only if we have data to process
    if (emailSendLogEntries.length > 0) {
      // Safely extract template IDs to get template info
      const templateIds: string[] = [];
      for (const log of emailSendLogEntries) {
        if (log?.template_id) {
          templateIds.push(log.template_id);
        }
      }

      // Create a map to match logs with events
      // We'll try multiple matching approaches:
      // 1. By message ID in raw_response
      // 2. By timestamp proximity
      // 3. By recipient email
      const sendLogMap = new Map<string, EmailSendLogEntry>();
      
      // First try by message ID in raw_response
      for (const log of emailSendLogEntries) {
        let messageId: string | null = null;
        
        if (log.raw_response) {
          try {
            const response = typeof log.raw_response === 'string' 
              ? JSON.parse(log.raw_response) 
              : log.raw_response;
            
            // Different email providers might store the message ID in different fields
            messageId = response.MessageID || response.message_id || response.id;
          } catch (e) {
            // Ignore JSON parse errors
          }
        }

        if (messageId) {
          sendLogMap.set(messageId, log);
        }
      };
      
      // Create a map for timestamp-based matching
      const logsByTimestamp = new Map<string, EmailSendLogEntry[]>();
      for (const log of emailSendLogEntries) {
        if (log.recipient_email && log.sent_at) {
          const key = `${log.recipient_email}:${new Date(log.sent_at).getTime()}`;
          const existing = logsByTimestamp.get(key) || [];
          logsByTimestamp.set(key, [...existing, log]);
        }
      }

      // Step 3: If we have template IDs, fetch template details for any missing subjects
      let templateDetailsMap = new Map<string, { name: string; subject: string }>();
      if (templateIds.length > 0) {
        const { data: templateData, error: templateError } = await supabase
          .from('email_templates')
          .select('id, name, subject')
          .in('id', templateIds) as unknown as { data: EmailTemplate[] | null, error: any };

        if (templateError) {
          console.error('Error fetching email_templates details:', templateError);
        } else if (templateData) {
          // Create a map of template IDs to template info
          for (const template of templateData) {
            if (template?.id) {
              templateDetailsMap.set(template.id, {
                name: template.name || 'Unknown Template',
                subject: template.subject || 'No Subject'
              });
            }
          }
        }
      }
      
      // Now, enhance our events with send log and template data
      augmentedEvents = augmentedEvents.map(event => {
        // Skip if we already have a subject from a campaign
        if (event.campaign_subject) {
          return event;
        }
        
        // First try matching by message ID
        const eventMessageId = event.provider_message_id || event.message_id;
        let matchedLog: EmailSendLogEntry | undefined;
        
        if (eventMessageId && sendLogMap.has(eventMessageId)) {
          matchedLog = sendLogMap.get(eventMessageId);
        }
        
        // If no match by message ID, try matching by timestamp
        if (!matchedLog && event.recipient_email && event.timestamp) {
          // Find logs sent within 60 seconds of the event timestamp
          const eventTime = new Date(event.timestamp).getTime();
          
          // Find the closest log by time for this recipient
          let closestLog: EmailSendLogEntry | undefined;
          let minTimeDiff = Infinity;
          
          for (const log of emailSendLogEntries) {
            if (log.recipient_email === event.recipient_email && log.sent_at) {
              const logTime = new Date(log.sent_at).getTime();
              const timeDiff = Math.abs(eventTime - logTime);
              
              // Only consider logs sent before or at same time as event and within 5 minutes
              if (logTime <= eventTime && timeDiff < 300000 && timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestLog = log;
              }
            }
          }
          
          if (closestLog) {
            matchedLog = closestLog;
          }
        }
        
        // If we found a matching log
        if (matchedLog) {
          // Use subject directly from log if available
          if (matchedLog.subject) {
            return {
              ...event,
              campaign_subject: matchedLog.subject
            };
          }
          
          // If not, try to get subject from template
          if (matchedLog.template_id && templateDetailsMap.has(matchedLog.template_id)) {
            const templateInfo = templateDetailsMap.get(matchedLog.template_id);
            if (templateInfo) {
              return {
                ...event,
                campaign_subject: templateInfo.subject,
                campaign_name: templateInfo.name || 'Transactional'
              };
            }
          }
        }

        
        return event;
      });
    }
  }

  return { events: augmentedEvents, total: count || 0 };
}
