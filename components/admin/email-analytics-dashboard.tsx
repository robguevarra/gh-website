// components/admin/email-analytics-dashboard.tsx

/**
 * EmailAnalyticsDashboard
 *
 * Displays platform-wide email analytics: metrics, trend chart, and top bounces.
 * Fetches data from /api/email/analytics (server component, SSR-friendly).
 *
 * Follows functional, modular, and mobile-first design using Shadcn UI primitives.
 */
"use client";





// Types for API response
interface DailyTrend {
  date: string;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam_complaints: number;
}

interface TopBouncedEmail {
  email: string;
  count: number;
}

interface EmailAnalytics {
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_spam_complaints: number;
  open_rate: number;
  click_rate: number;
  spam_complaint_rate: number;
  trends: DailyTrend[];
  top_bounced_emails: TopBouncedEmail[];
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer } from '@/components/ui/chart';
import * as Recharts from 'recharts';
import { EmailAnalyticsFilters, EmailAnalyticsFilters as Filters } from './email-analytics-filters';

export default function EmailAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ dateFrom: '', dateTo: '', eventType: '' });

  useEffect(() => {
    setLoading(true);
    fetch('/api/email/analytics')
      .then(res => res.ok ? res.json() : null)
      .then((data: EmailAnalytics | null) => {
        setAnalytics(data);
        if (data && data.trends.length) {
          setFilters(f => ({
            ...f,
            dateFrom: data.trends[0].date,
            dateTo: data.trends[data.trends.length - 1].date,
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton className="h-40 w-full rounded" />;
  }
  if (!analytics) {
    return (
      <section className="space-y-6">
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Email Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-destructive">Failed to load email analytics. (Check API and DB connection.)</div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Filter trends by date and event type
  const filteredTrends = analytics.trends.filter(trend => {
    const inRange = (!filters.dateFrom || trend.date >= filters.dateFrom) && (!filters.dateTo || trend.date <= filters.dateTo);
    return inRange;
  });

  return (
    <section className="space-y-6">
      {/* Filters */}
      <EmailAnalyticsFilters filters={filters} onChange={setFilters} />
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard label="Delivered" value={analytics.total_delivered} />
        <MetricCard label="Opened" value={analytics.total_opened} />
        <MetricCard label="Clicked" value={analytics.total_clicked} />
        <MetricCard label="Bounced" value={analytics.total_bounced} />
        <MetricCard label="Spam Complaints" value={analytics.total_spam_complaints} />
      </div>
      {/* Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RateCard label="Open Rate" value={analytics.open_rate} />
        <RateCard label="Click Rate" value={analytics.click_rate} />
        <RateCard label="Spam Rate" value={analytics.spam_complaint_rate} />
      </div>
      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Email Trends (Filtered)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ delivered: { label: 'Delivered', color: '#3b82f6' }, opened: { label: 'Opened', color: '#22c55e' }, clicked: { label: 'Clicked', color: '#f59e42' }, bounced: { label: 'Bounced', color: '#ef4444' }, spam_complaints: { label: 'Spam', color: '#a21caf' } }}>
            <Recharts.LineChart data={filteredTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <Recharts.XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <Recharts.YAxis tick={{ fontSize: 12 }} />
              <Recharts.Tooltip />
              <Recharts.Legend />
              {(filters.eventType === '' || filters.eventType === 'delivered') && <Recharts.Line type="monotone" dataKey="delivered" stroke="#3b82f6" dot={false} />}
              {(filters.eventType === '' || filters.eventType === 'opened') && <Recharts.Line type="monotone" dataKey="opened" stroke="#22c55e" dot={false} />}
              {(filters.eventType === '' || filters.eventType === 'clicked') && <Recharts.Line type="monotone" dataKey="clicked" stroke="#f59e42" dot={false} />}
              {(filters.eventType === '' || filters.eventType === 'bounced') && <Recharts.Line type="monotone" dataKey="bounced" stroke="#ef4444" dot={false} />}
              {(filters.eventType === '' || filters.eventType === 'spam_complaints') && <Recharts.Line type="monotone" dataKey="spam_complaints" stroke="#a21caf" dot={false} />}
            </Recharts.LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      {/* Top Bounced Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Bounced Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <TopBouncedEmailsTable emails={analytics.top_bounced_emails} />
        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function RateCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-sm font-medium text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold">{value.toFixed(1)}%</div>
      </CardContent>
    </Card>
  );
}

function TopBouncedEmailsTable({ emails }: { emails: TopBouncedEmail[] }) {
  if (!emails.length) return <div className="text-muted-foreground">No bounces recorded.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left font-semibold py-3 px-4">Email</th>
            <th className="text-left font-semibold py-3 px-4">Count</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((e) => (
            <tr key={e.email} className="border-b">
              <td className="py-3 px-4 break-all">{e.email}</td>
              <td className="py-3 px-4 font-medium">{e.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
