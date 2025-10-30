import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(), // ISO 8601 date string
  endDate: z.string().optional(),   // ISO 8601 date string
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

  // Normalize dates to YYYY-MM-DD to avoid timezone issues with date columns
  const toYmd = (iso?: string) => {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return undefined;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const ymdStart = toYmd(startDate);
  const ymdEnd = toYmd(endDate);

  // 3. Fetch data: aggregate from marketing_performance_view (already deduped via ad_spend_dedup)
  try {
    // Fetch rows and aggregate in-memory (parity with Summary, avoids PostgREST aggregate syntax issues)
    let rowsQuery = supabase
      .from('marketing_performance_view')
      .select('date, spend, impressions, clicks')
      .eq('source_channel', 'facebook');
    if (ymdStart) rowsQuery = rowsQuery.gte('date', ymdStart);
    if (ymdEnd) rowsQuery = rowsQuery.lte('date', ymdEnd);
    // Use a generous range to avoid pagination undercounts in larger windows
    // Note: PostgREST respects Range header; supabase-js translates .range()
    const { data: rows, error: rowsErr } = await rowsQuery.range(0, 100000);
    if (rowsErr) {
      console.error('Error fetching rows from marketing_performance_view (by-channel):', rowsErr);
      return NextResponse.json({ error: 'Failed to fetch marketing data', details: rowsErr.message }, { status: 500 });
    }
    const fb = (rows ?? []).reduce(
      (acc, r: any) => {
        acc.spend += Number(r.spend) || 0;
        acc.impressions += Number(r.impressions) || 0;
        acc.clicks += Number(r.clicks) || 0;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0 }
    );

    // Enrollments (optional): count distinct p2p enrollments from performance view for the same window, facebook channel
    let enrollments = 0;
    try {
      let enrollQuery = supabase
        .from('marketing_performance_view')
        .select('enrollment_id, source_channel, date')
        .eq('source_channel', 'facebook');
      if (ymdStart) enrollQuery = enrollQuery.gte('date', ymdStart);
      if (ymdEnd) enrollQuery = enrollQuery.lte('date', ymdEnd);
      const { data: enrollRows, error: enrollErr } = await enrollQuery;
      if (!enrollErr && Array.isArray(enrollRows)) {
        const set = new Set<string>();
        for (const er of enrollRows as any[]) {
          if (er.enrollment_id) set.add(er.enrollment_id);
        }
        enrollments = set.size;
      }
    } catch {}

    const responseData: ChannelPerformanceData[] = [
      {
        channel: 'facebook',
        spend: fb.spend,
        impressions: fb.impressions,
        clicks: fb.clicks,
        revenue: null,
        enrollments,
        // Blocked metrics
        attributedRevenue: null,
        roas: null,
        cpa: null,
        conversionCount: null,
        conversionRate: null,
      },
    ];

    if (searchParams.get('debug') === '1') {
      return NextResponse.json({
        data: responseData,
        debug: {
          filters: { startDate: ymdStart ?? null, endDate: ymdEnd ?? null },
          note: 'Aggregated from marketing_performance_view (deduped)',
        }
      });
    }

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