// components/admin/user-email-analytics.tsx
"use client";
import { useEffect, useState } from "react";
import { EmailEvent, EmailEventType } from '@/lib/supabase/data-access/email-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { EmailAnalyticsFilters } from './email-analytics-filters';
import { BarChart2, MailOpen, MousePointerClick, AlertTriangle, ShieldOff, Mail } from 'lucide-react';
import { format } from 'date-fns';

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
}

export function UserEmailAnalytics({ userId }: UserEmailAnalyticsProps) {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [summary, setSummary] = useState<EmailAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ eventType?: EmailEventType; dateFrom?: string; dateTo?: string }>({});

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.eventType) params.set('eventType', filters.eventType);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    fetch(`/api/admin/users/${userId}/email-events?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        // Aggregate summary
        const summary: EmailAnalyticsSummary = {
          delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0
        };
        for (const ev of data.events || []) {
          switch (ev.event_type) {
            case 'delivered': summary.delivered++; break;
            case 'opened': summary.opened++; break;
            case 'clicked': summary.clicked++; break;
            case 'bounced': summary.bounced++; break;
            case 'spam': summary.spam++; break;
            case 'unsubscribed': summary.unsubscribed++; break;
          }
        }
        setSummary(summary);
        setLoading(false);
      });
  }, [userId, filters]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-primary" /> Email Analytics
      </h2>
      <EmailAnalyticsFilters
        filters={filters}
        onChange={setFilters}
        eventTypes={["delivered", "opened", "clicked", "bounced", "spam", "unsubscribed"]}
      />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)
        ) : summary && (
          <>
            <Card><CardHeader><CardTitle><Mail className="h-4 w-4 mr-2 inline-block" />Delivered</CardTitle></CardHeader><CardContent>{summary.delivered}</CardContent></Card>
            <Card><CardHeader><CardTitle><MailOpen className="h-4 w-4 mr-2 inline-block" />Opened</CardTitle></CardHeader><CardContent>{summary.opened}</CardContent></Card>
            <Card><CardHeader><CardTitle><MousePointerClick className="h-4 w-4 mr-2 inline-block" />Clicked</CardTitle></CardHeader><CardContent>{summary.clicked}</CardContent></Card>
            <Card><CardHeader><CardTitle><AlertTriangle className="h-4 w-4 mr-2 inline-block" />Bounced</CardTitle></CardHeader><CardContent>{summary.bounced}</CardContent></Card>
            <Card><CardHeader><CardTitle><ShieldOff className="h-4 w-4 mr-2 inline-block" />Spam</CardTitle></CardHeader><CardContent>{summary.spam}</CardContent></Card>
            <Card><CardHeader><CardTitle>Unsubscribed</CardTitle></CardHeader><CardContent>{summary.unsubscribed}</CardContent></Card>
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
