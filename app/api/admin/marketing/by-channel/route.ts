import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(), // ISO 8601 date string
  endDate: z.string().optional(), // ISO 8601 date string
});

// Define the structure for the response items
interface ChannelPerformanceData {
  channel: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  revenue: number | null;
  enrollments: number | null;
  // Metrics blocked by ad attribution
  attributedRevenue: null;
  roas: null;
  cpa: null;
  conversionCount: null;
  conversionRate: null;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // 1. Check admin authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdminUser = await validateAdminStatus(user.id);
  if (!isAdminUser) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // 2. Get and validate query parameters
  const { searchParams } = new URL(request.url);
  const validationResult = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: validationResult.error.errors }, { status: 400 });
  }

  const { startDate, endDate } = validationResult.data;

  // 3. Fetch data using the marketing_performance_view
  try {
    let query = supabase
      .from('marketing_performance_view')
      .select('source_channel, spend, impressions, clicks, attributed_revenue, enrollment_id');

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Regenerated types should now correctly infer the return type
    const { data: viewData, error: viewError } = await query;

    if (viewError) {
      console.error('Error fetching marketing performance view:', viewError);
      return NextResponse.json({ error: 'Failed to fetch marketing data', details: viewError.message }, { status: 500 });
    }

    // 4. Aggregate data by channel
    const aggregatedData: { [key: string]: Partial<ChannelPerformanceData> } = {};

    // Use optional chaining and nullish coalescing for safety
    viewData?.forEach(row => {
      // Access properties directly, relying on regenerated types
      const channel = row.source_channel || 'unknown';
      if (!aggregatedData[channel]) {
        aggregatedData[channel] = { channel, spend: 0, impressions: 0, clicks: 0, revenue: 0, enrollments: 0 };
      }

      aggregatedData[channel].spend = (aggregatedData[channel].spend || 0) + (row.spend || 0);
      aggregatedData[channel].impressions = (aggregatedData[channel].impressions || 0) + (row.impressions || 0);
      aggregatedData[channel].clicks = (aggregatedData[channel].clicks || 0) + (row.clicks || 0);
      aggregatedData[channel].revenue = (aggregatedData[channel].revenue || 0) + (row.attributed_revenue || 0);
      if (row.enrollment_id) {
        aggregatedData[channel].enrollments = (aggregatedData[channel].enrollments || 0) + 1;
      }
    });

    // Format the response, ensuring null defaults for potentially missing aggregated values
    const responseData: ChannelPerformanceData[] = Object.values(aggregatedData).map(channelData => ({
      channel: channelData.channel!,
      spend: channelData.spend ?? null,
      impressions: channelData.impressions ?? null,
      clicks: channelData.clicks ?? null,
      revenue: channelData.revenue ?? null,
      enrollments: channelData.enrollments ?? null,
      // Blocked metrics
      attributedRevenue: null,
      roas: null,
      cpa: null,
      conversionCount: null,
      conversionRate: null,
    }));

    return NextResponse.json(responseData);

  } catch (err) {
    console.error('Unexpected error fetching marketing by channel:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'An unexpected server error occurred', details: errorMessage }, { status: 500 });
  }
}

// Disallow other methods
export async function POST() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function PATCH() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); } 