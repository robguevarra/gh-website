import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server'; // Use project's server client helper
import { validateAdminStatus } from '@/lib/supabase/admin'; // Use project's admin check helper

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(), // ISO 8601 date string
  endDate: z.string().optional(),   // ISO 8601 date string
  channels: z.string().optional(),  // comma-separated
  debug: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient(); // Initialize client using helper

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

  const { startDate, endDate, channels, debug } = validationResult.data;

  // Normalize dates to YYYY-MM-DD to avoid timezone issues with date column
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
  if (ymdStart && ymdEnd && ymdStart > ymdEnd) {
    return NextResponse.json({ error: 'Invalid date range: startDate must be <= endDate' }, { status: 400 });
  }

  // 3. Fetch data
  try {
    // Deduplicate spend per day and entity; read from deduped performance view
    let query = supabase
      .from('marketing_performance_view')
      .select('date, ad_id, adset_id, campaign_id, spend, spend_currency, source_channel');

    if (ymdStart) query = query.gte('date', ymdStart);
    if (ymdEnd) query = query.lte('date', ymdEnd);

    const url = new URL(request.url);
    const channelParams = url.searchParams.getAll('channel');
    let channelList: string[] = [];
    if (channelParams.length > 0) {
      channelList = channelParams;
    } else if (channels) {
      channelList = channels.split(',').map(s => s.trim()).filter(Boolean);
    }
    const channelFilterActive = channelList.length > 0;
    const includesFacebook = !channelFilterActive || channelList.some(c => /facebook/i.test(c));
    // Filter to facebook since that's our only ad spend source currently
    query = query.eq('source_channel', 'facebook');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ad_spend for summary:', error);
      return NextResponse.json({ error: 'Failed to fetch marketing summary', details: error.message }, { status: 500 });
    }

    let totalAdSpend = 0;
    let currency: string | null = null;
    if (includesFacebook) {
      const rows = data ?? [];
      // Dedup key: day + entity (prefer ad_id, else adset_id, else campaign_id)
      const seen = new Map<string, { spend: number; impressions: number; clicks: number }>();
      for (const r of rows as any[]) {
        const id = r.ad_id ?? r.adset_id ?? r.campaign_id ?? 'unknown';
        const key = `${r.date}|${id}`;
        const cur = seen.get(key);
        const next = {
          spend: Math.max(cur?.spend ?? 0, Number(r.spend) || 0),
          impressions: Math.max(cur?.impressions ?? 0, 0),
          clicks: Math.max(cur?.clicks ?? 0, 0),
        };
        seen.set(key, next);
        if (!currency && (r as any).spend_currency) currency = (r as any).spend_currency;
      }
      totalAdSpend = Array.from(seen.values()).reduce((s, v) => s + v.spend, 0);
    } else {
      totalAdSpend = 0;
    }

    // Prepare summary data
    const summary = {
      totalAdSpend: totalAdSpend.toFixed(2),
      currency: currency ?? null,
      totalAttributedRevenue: null, // Blocked by ad attribution
      overallROAS: null, // Blocked by ad attribution
      averageCPA: null, // Blocked by ad attribution
    };

    if (debug === '1') {
      return NextResponse.json({
        summary,
        debug: {
          filters: { startDate: ymdStart ?? null, endDate: ymdEnd ?? null, channels: channelList ?? null },
          note: 'Deduped per (date, entity) using max values',
        },
      });
    }
    return NextResponse.json(summary);

  } catch (err) {
    console.error('Unexpected error fetching marketing summary:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'An unexpected server error occurred', details: errorMessage }, { status: 500 });
  }
}

// Basic security measure: disallow other methods
export async function POST() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
export async function PATCH() {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
} 