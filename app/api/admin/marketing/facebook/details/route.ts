import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(), // ISO 8601 date string
  endDate: z.string().optional(),   // ISO 8601 date string
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['date', 'spend', 'impressions', 'clicks']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Define the structure for the response items
interface FacebookAdDetail {
  date: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  // Blocked metrics
  attributedRevenue: null;
  roas: null;
  cpa: null;
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

  const { startDate, endDate, page, limit, sortBy, sortOrder } = validationResult.data;

  // Normalize dates to YYYY-MM-DD to avoid TZ issues with a date column
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

  // Pagination & sorting defaults/sanitization
  const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit ?? '50', 10) || 50));
  const offset = (pageNum - 1) * limitNum;
  const orderBy = sortBy ?? 'date';
  const ascending = (sortOrder ?? 'desc') === 'asc';

  // 3. Fetch detailed Facebook ad spend data from consolidated performance view
  try {
    let query = supabase
      .from('marketing_performance_view')
      .select('date,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,source_channel')
      .eq('source_channel', 'facebook')
      .order(orderBy, { ascending })
      .range(offset, offset + limitNum - 1);

    // Apply date filters
    if (ymdStart) {
      query = query.gte('date', ymdStart);
    }
    if (ymdEnd) {
      query = query.lte('date', ymdEnd);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching Facebook ad details:', error);
      return NextResponse.json({ error: 'Failed to fetch Facebook ad details', details: error.message }, { status: 500 });
    }

    // 4. Format the response
    const responseData: FacebookAdDetail[] = data?.map((row: any) => ({
      date: row.date ?? null,
      campaign_id: row.campaign_id ?? null,
      campaign_name: row.campaign_name ?? null,
      adset_id: row.adset_id ?? null,
      adset_name: row.adset_name ?? null,
      ad_id: row.ad_id ?? null,
      ad_name: row.ad_name ?? null,
      spend: row.spend ?? null,
      impressions: row.impressions ?? null,
      clicks: row.clicks ?? null,
      // Blocked metrics
      attributedRevenue: null,
      roas: null,
      cpa: null,
    })) || [];

    // Add count for pagination if implemented later
    // const { count } = await query; // Need to run count query separately

    return NextResponse.json(responseData);
    // return NextResponse.json({ data: responseData, count });

  } catch (err) {
    console.error('Unexpected error fetching Facebook ad details:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'An unexpected server error occurred', details: errorMessage }, { status: 500 });
  }
}

// Disallow other methods
export async function POST() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function PATCH() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); } 