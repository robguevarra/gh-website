import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().uuid(), // Campaign ID from the path
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getAdminClient();
  const validation = paramsSchema.safeParse(params);

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid campaign ID format', details: validation.error.format() }, { status: 400 });
  }

  const { id: campaignId } = validation.data;

  try {
    // 1. Fetch aggregate analytics from campaign_analytics
    const { data: campaignAnalytics, error: analyticsError } = await supabase
      .from('campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (analyticsError && analyticsError.code !== 'PGRST116') { // PGRST116: no rows found, which is acceptable
      console.error(`[API Campaign Analytics Overview] Error fetching campaign_analytics for ${campaignId}:`, analyticsError);
      return NextResponse.json({ error: 'Failed to fetch campaign analytics aggregates', details: analyticsError.message }, { status: 500 });
    }

    // 2. Fetch time-series data for opens and clicks from email_events (e.g., last 7 days)
    //    Adjust the date range and grouping as needed for the dashboard.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: timeSeriesEvents, error: timeSeriesError } = await supabase
      .from('email_events')
      .select('event_type, received_at')
      .eq('campaign_id', campaignId)
      .in('event_type', ['Open', 'Click'])
      .gte('received_at', sevenDaysAgo.toISOString())
      .order('received_at', { ascending: true });
    
    if (timeSeriesError) {
      console.error(`[API Campaign Analytics Overview] Error fetching time-series events for ${campaignId}:`, timeSeriesError);
      // Don't fail the whole request if only time-series fails, return aggregates
    }

    // Process time-series data into a more usable format (e.g., daily counts)
    const dailyCounts: { [date: string]: { opens: number; clicks: number } } = {};
    if (timeSeriesEvents) {
      timeSeriesEvents.forEach(event => {
        const date = new Date(event.received_at).toISOString().split('T')[0]; // YYYY-MM-DD
        if (!dailyCounts[date]) {
          dailyCounts[date] = { opens: 0, clicks: 0 };
        }
        if (event.event_type === 'Open') {
          dailyCounts[date].opens++;
        }
        if (event.event_type === 'Click') {
          dailyCounts[date].clicks++;
        }
      });
    }

    return NextResponse.json({
      campaignAnalytics: campaignAnalytics || { campaign_id: campaignId }, // Return empty object if no analytics yet
      timeSeriesData: dailyCounts,
    });

  } catch (error: any) {
    console.error(`[API Campaign Analytics Overview] Unhandled error for campaign ${campaignId}:`, error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
} 