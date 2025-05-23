// components/admin/user-email-analytics.tsx
"use client";
import { useEffect, useState } from "react";
import { EmailEvent, EmailEventType } from '@/lib/supabase/data-access/email-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { EmailAnalyticsFilters as EmailAnalyticsFiltersComponent, type EmailAnalyticsFilters as EmailAnalyticsFiltersType } from './email-analytics-filters';
import { BarChart2, MailOpen, MousePointerClick, AlertTriangle, ShieldOff, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";

// Define the new interface for a processed email entry
interface ProcessedEmail {
  id: string; // Unique identifier for the email dispatch (e.g., message_id)
  subject?: string;
  campaignId?: string | null;
  // campaignName?: string; // Future enhancement: resolve campaign name
  sentAt?: string; // Timestamp of initial send/delivery
  isDelivered: boolean;
  isOpened: boolean;
  isClicked: boolean;
  isBounced: boolean;
  isSpamComplaint: boolean;
  isUnsubscribed: boolean; // Unsubscribed as a result of interaction with this email
  rawEvents: EmailEvent[]; // Store the original events related to this dispatch
}

interface UserEmailAnalyticsProps {
  userId: string;
}

interface EmailAnalyticsSummary {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
  deliverability_status: 'Good' | 'Issue' | 'Unknown';
  is_currently_bounced: boolean;
}

export function UserEmailAnalytics({ userId }: UserEmailAnalyticsProps) {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [summary, setSummary] = useState<EmailAnalyticsSummary | null>(null);
  const [processedEmails, setProcessedEmails] = useState<ProcessedEmail[]>([]); // New state for transformed email history
  const [loading, setLoading] = useState(true);
  const [clearingBounce, setClearingBounce] = useState(false);
  const [filters, setFilters] = useState<EmailAnalyticsFiltersType>({ 
    eventType: '', 
    dateFrom: '', 
    dateTo: '' 
  });

  const fetchAnalyticsData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.eventType) params.set('eventType', filters.eventType);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    console.log('[UserEmailAnalytics] Fetching with filters:', filters); // Log filters before fetch

    fetch(`/api/admin/users/${userId}/email-events?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        console.log('Full API Response Data:', data);
        const rawEventsData = data.events || [];
        setEvents(rawEventsData);
        const isCurrentlyBounced = data.profile?.email_bounced ?? false; 

        // --- Begin Summary Calculation (existing logic) ---
        const newSummary: EmailAnalyticsSummary = {
          delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0,
          open_rate: 0, click_rate: 0,
          deliverability_status: 'Unknown',
          is_currently_bounced: isCurrentlyBounced 
        };
        for (const ev of rawEventsData) {
          switch (ev.event_type) {
            case 'delivered': newSummary.delivered++; break;
            case 'opened': newSummary.opened++; break;
            case 'clicked': newSummary.clicked++; break;
            case 'bounced': newSummary.bounced++; break;
            case 'spam': newSummary.spam++; break;
            case 'unsubscribed': newSummary.unsubscribed++; break;
          }
        }
        if (newSummary.delivered > 0) {
          newSummary.open_rate = (newSummary.opened / newSummary.delivered) * 100;
          newSummary.click_rate = (newSummary.clicked / newSummary.delivered) * 100;
        }
        if (newSummary.bounced > 0) {
          newSummary.deliverability_status = 'Issue'; 
        } else if (newSummary.delivered > 0) {
          newSummary.deliverability_status = 'Good';
        }
        setSummary(newSummary);
        // --- End Summary Calculation ---

        // --- Begin Email History Processing ---
        const emailGroups: Record<string, ProcessedEmail> = {};

        // Sort events by timestamp ascending to process them in order
        const sortedEvents = [...rawEventsData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        for (const event of sortedEvents) {
          // Use message_id as the primary grouping key if available and seems reasonably unique.
          // Fallback to a composite key if message_id is null or for non-campaign/non-message_id events.
          // For simplicity now, we'll primarily rely on message_id if present, or event.id for events without it (making them unique entries).
          const groupId = event.message_id || `event-${event.id}`; 

          if (!emailGroups[groupId]) {
            emailGroups[groupId] = {
              id: groupId,
              subject: event.metadata?.subject as string || 'No Subject',
              campaignId: event.campaign_id,
              sentAt: event.timestamp, // Default to first event's timestamp, can be refined by 'delivered' event
              isDelivered: false,
              isOpened: false,
              isClicked: false,
              isBounced: false,
              isSpamComplaint: false,
              isUnsubscribed: false,
              rawEvents: [],
            };
          }

          emailGroups[groupId].rawEvents.push(event);

          switch (event.event_type) {
            case 'delivered':
              emailGroups[groupId].isDelivered = true;
              // Update sentAt to the delivered timestamp if more accurate
              emailGroups[groupId].sentAt = event.timestamp; 
              break;
            case 'opened':
              emailGroups[groupId].isOpened = true;
              break;
            case 'clicked':
              emailGroups[groupId].isClicked = true;
              break;
            case 'bounced':
              emailGroups[groupId].isBounced = true;
              break;
            case 'spam': // Assuming 'spam' means spam complaint
              emailGroups[groupId].isSpamComplaint = true;
              break;
            case 'unsubscribed':
              emailGroups[groupId].isUnsubscribed = true;
              break;
          }
        }
        
        const processedEmailList = Object.values(emailGroups).sort((a, b) => 
          new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime()
        );
        setProcessedEmails(processedEmailList);
        console.log('Processed Emails for History:', processedEmailList);
        // --- End Email History Processing ---

        setLoading(false);
      }).catch(error => {
        console.error("Failed to fetch email analytics:", error);
        setLoading(false);
        // Set a summary that indicates an error or partial data
        setSummary({
          delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0,
          open_rate: 0, click_rate: 0, deliverability_status: 'Unknown', is_currently_bounced: false
        });
      });
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [userId, filters]);

  const handleClearBounceStatus = async () => {
    setClearingBounce(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-bounce-status`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear bounce status');
      }
      console.log('Bounce status cleared successfully');
      // Refresh data to reflect the change
      fetchAnalyticsData(); 
    } catch (error) {
      console.error('Error clearing bounce status:', error);
      // Handle error display to user, e.g., toast notification
    } finally {
      setClearingBounce(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-primary" /> Email Analytics
      </h2>
      <EmailAnalyticsFiltersComponent
        filters={filters}
        onChange={setFilters}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : summary && (
          <>
            <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center"><Mail className="h-4 w-4 mr-2" />Delivered</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.delivered}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center"><MailOpen className="h-4 w-4 mr-2" />Opened</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.opened}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center"><MousePointerClick className="h-4 w-4 mr-2" />Clicked</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.clicked}</div></CardContent></Card>
            
            <Card className={summary.bounced > 0 ? "border-destructive" : ""}>
              <CardHeader><CardTitle className={`text-sm font-medium flex items-center ${summary.bounced > 0 ? "text-destructive" : ""}`}><AlertTriangle className="h-4 w-4 mr-2" />Bounced</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{summary.bounced}</div></CardContent>
            </Card>
            
            <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center"><ShieldOff className="h-4 w-4 mr-2" />Spam</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.spam}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center">Unsubscribed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.unsubscribed}</div></CardContent></Card>
            
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium flex items-center"><BarChart2 className="h-4 w-4 mr-2" />Open Rate</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{summary.open_rate.toFixed(1)}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium flex items-center"><BarChart2 className="h-4 w-4 mr-2" />Click Rate</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{summary.click_rate.toFixed(1)}%</div></CardContent>
            </Card>

            <Card className={
              summary.is_currently_bounced ? "border-destructive bg-destructive/10" : 
              summary.deliverability_status === 'Good' ? "border-green-500 bg-green-500/10" : "bg-muted/30"
            }>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium flex items-center">
                    {summary.is_currently_bounced && <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />}
                    {!summary.is_currently_bounced && summary.deliverability_status === 'Good' && <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />}
                    {!summary.is_currently_bounced && summary.deliverability_status === 'Issue' && <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />} {/* Historically bounced but not currently */} 
                    Deliverability
                  </CardTitle>
                  {summary.is_currently_bounced && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={handleClearBounceStatus}
                      disabled={clearingBounce}
                    >
                      {clearingBounce ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      Clear Bounce
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.is_currently_bounced ? "text-destructive" : !summary.is_currently_bounced && summary.deliverability_status === 'Good' ? "text-green-700" : ""}`}>
                  {summary.is_currently_bounced ? 'Hard Bounced' : 
                   !summary.is_currently_bounced && summary.deliverability_status === 'Issue' ? 'Good (Previously Bounced)' : summary.deliverability_status}
                </div>
                {summary.is_currently_bounced && <p className="text-xs text-muted-foreground">User will not receive emails.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <div>
        <h3 className="font-semibold mt-6 mb-2">Recent Email Events</h3>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Type</th>
                  <th className="text-left">Recipient</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted-foreground">No events found.</td></tr>
                ) : (
                  events.slice(0, 20).map(ev => (
                    <tr key={ev.id}>
                      <td>{ev.event_type}</td>
                      <td>{ev.recipient}</td>
                      <td>{format(new Date(ev.timestamp), 'yyyy-MM-dd HH:mm')}</td>
                      <td className="max-w-xs truncate text-muted-foreground">{ev.metadata?.subject || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserEmailAnalytics;


