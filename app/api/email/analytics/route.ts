/**
 * Email Analytics API Route
 *
 * Aggregates and returns advanced analytics for Postmark email events.
 * Supports filtering by date range (start, end query params).
 * Returns summary counts, rates, daily trends, and top bounced emails for dashboard and reporting use.
 *
 * Usage:
 *   GET /api/email/analytics?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Response Example:
 *   {
 *     total_delivered: number,
 *     total_opened: number,
 *     total_clicked: number,
 *     total_bounced: number,
 *     total_spam_complaints: number,
 *     open_rate: number,
 *     click_rate: number,
 *     spam_complaint_rate: number,
 *     trends: DailyTrend[],
 *     top_bounced_emails: TopBouncedEmail[]
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// Types for aggregation result
/**
 * DailyTrend
 *
 * Represents aggregated event counts for a single day.
 * Used for time series charts in the dashboard.
 */
interface DailyTrend {
  date: string; // YYYY-MM-DD
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam_complaints: number;
}

/**
 * TopBouncedEmail
 *
 * Represents an email address with its total bounce count.
 * Used to identify deliverability issues.
 */
interface TopBouncedEmail {
  email: string;
  count: number;
}

/**
 * EmailAnalytics
 *
 * The main response structure for the analytics API.
 * Includes summary counts, rates, daily trends, and top bounced emails.
 */
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

// Helper: Get date range from search params
/**
 * Extracts the start and end date filters from the request's search params.
 * Returns JS Date objects or null if not provided.
 */
function getDateRange(searchParams: URLSearchParams) {
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  return {
    start: start ? new Date(start) : null,
    end: end ? new Date(end) : null,
  };
}

// Main API handler
/**
 * GET /api/email/analytics
 *
 * Main handler for the analytics API.
 * Aggregates and returns email event analytics for the given date range.
 */
export async function GET(req: NextRequest) {
  const supabase = getAdminClient();
  const { searchParams } = new URL(req.url);
  const { start, end } = getDateRange(searchParams);

  // Fetch all relevant fields for advanced analytics
  let query = supabase.from('email_events').select('event_type, received_at, metadata', { count: 'exact' });
  if (start) query = query.gte('received_at', start.toISOString());
  if (end) query = query.lte('received_at', end.toISOString());

  const { data, error } = await query;
  if (error) {
    console.error('[Email Analytics] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }

  // --- Aggregate summary counts ---
  let total_delivered = 0;
  let total_opened = 0;
  let total_clicked = 0;
  let total_bounced = 0;
  let total_spam_complaints = 0;

  // --- Trends by day ---
  const trendsMap = new Map<string, DailyTrend>();

  // --- Top bounced emails ---
  const bounceEmailCounts: Record<string, number> = {};

  for (const row of data || []) {
    const { event_type, received_at, metadata } = row;
    // Date as YYYY-MM-DD from received_at
    const date = received_at ? new Date(received_at).toISOString().slice(0, 10) : 'unknown';
    // Init trend bucket
    if (!trendsMap.has(date)) {
      trendsMap.set(date, { date, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam_complaints: 0 });
    }
    const trend = trendsMap.get(date)!;
    // Count by type using event_type
    switch (event_type) {
      case 'Delivery':
        total_delivered++;
        trend.delivered++;
        break;
      case 'Open':
        total_opened++;
        trend.opened++;
        break;
      case 'Click':
        total_clicked++;
        trend.clicked++;
        break;
      case 'Bounce':
        total_bounced++;
        trend.bounced++;
        // Try to extract email address from metadata (original Postmark payload)
        // Ensure metadata is treated as an object for property access
        const bounceRecipientEmail = 
          typeof metadata === 'object' && metadata !== null 
            ? (metadata as any).Email || (metadata as any).email || (metadata as any).Recipient 
            : null;
        if (bounceRecipientEmail) {
          bounceEmailCounts[bounceRecipientEmail] = (bounceEmailCounts[bounceRecipientEmail] || 0) + 1;
        }
        break;
      case 'SpamComplaint':
        total_spam_complaints++;
        trend.spam_complaints++;
        break;
      default:
        break;
    }
  }

  // --- Calculate rates ---
  const open_rate = total_delivered > 0 ? (total_opened / total_delivered) * 100 : 0;
  const click_rate = total_delivered > 0 ? (total_clicked / total_delivered) * 100 : 0;
  const spam_complaint_rate = total_delivered > 0 ? (total_spam_complaints / total_delivered) * 100 : 0;

  // --- Trends array ---
  const trends: DailyTrend[] = Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // --- Top bounced emails ---
  const top_bounced_emails: TopBouncedEmail[] = Object.entries(bounceEmailCounts)
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const analytics: EmailAnalytics = {
    total_delivered,
    total_opened,
    total_clicked,
    total_bounced,
    total_spam_complaints,
    open_rate,
    click_rate,
    spam_complaint_rate,
    trends,
    top_bounced_emails,
  };

  return NextResponse.json(analytics);
}
