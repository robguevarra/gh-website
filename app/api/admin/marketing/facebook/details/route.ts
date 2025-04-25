import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(), // ISO 8601 date string
  endDate: z.string().optional(), // ISO 8601 date string
  // Add pagination and sorting parameters if needed later
  // page: z.string().optional().default('1'),
  // limit: z.string().optional().default('20'),
  // sortBy: z.string().optional().default('date'),
  // sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
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

  const { startDate, endDate } = validationResult.data;
  // const page = parseInt(validationResult.data.page || '1');
  // const limit = parseInt(validationResult.data.limit || '20');
  // const offset = (page - 1) * limit;

  // 3. Fetch detailed Facebook ad spend data
  try {
    // We query ad_spend and join upwards to get campaign/adset/ad names
    // Using the view might be less efficient here as we only need FB data
    let query = supabase
      .from('ad_spend')
      .select(`
        date,
        spend,
        impressions,
        clicks,
        ad_ads!inner(
          ad_id:id,
          ad_name:name,
          ad_adsets!inner(
            adset_id:id,
            adset_name:name,
            ad_campaigns!inner(
              campaign_id:id,
              campaign_name:name
            )
          )
        )
      `)
      // .order(validationResult.data.sortBy, { ascending: validationResult.data.sortOrder === 'asc' })
      // .range(offset, offset + limit - 1);

    // Apply date filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching Facebook ad details:', error);
      return NextResponse.json({ error: 'Failed to fetch Facebook ad details', details: error.message }, { status: 500 });
    }

    // 4. Format the response
    const responseData: FacebookAdDetail[] = data?.map((row: any) => ({
      date: row.date,
      campaign_id: row.ad_ads?.ad_adsets?.ad_campaigns?.campaign_id ?? null,
      campaign_name: row.ad_ads?.ad_adsets?.ad_campaigns?.campaign_name ?? null,
      adset_id: row.ad_ads?.ad_adsets?.adset_id ?? null,
      adset_name: row.ad_ads?.ad_adsets?.adset_name ?? null,
      ad_id: row.ad_ads?.ad_id ?? null,
      ad_name: row.ad_ads?.ad_name ?? null,
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