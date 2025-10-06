import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';

const querySchema = z.object({
  startDate: z.string().optional(), // ISO
  endDate: z.string().optional(),   // ISO
  channels: z.string().optional(),  // comma-separated (e.g., facebook,organic)
  groupBy: z.enum(['day']).optional(),
});

const toYmd = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = await validateAdminStatus(user.id);
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Params
  const { searchParams } = new URL(request.url);
  const paramsObj = Object.fromEntries(searchParams);
  const parsed = querySchema.safeParse(paramsObj);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
  }

  const { startDate, endDate, channels } = parsed.data;
  const ymdStart = toYmd(startDate);
  const ymdEnd = toYmd(endDate);
  if (ymdStart && ymdEnd && ymdStart > ymdEnd) {
    return NextResponse.json({ error: 'Invalid date range: startDate must be <= endDate' }, { status: 400 });
    }

  // Derive channels list (support repeated ?channel= as well)
  const channelParams = searchParams.getAll('channel');
  let channelList: string[] | undefined = undefined;
  if (channelParams.length > 0) {
    channelList = channelParams;
  } else if (channels) {
    channelList = channels.split(',').map(s => s.trim()).filter(Boolean);
  }

  try {
    let query = supabase
      .from('marketing_kpis_channel_daily')
      .select('date,source_channel,spend,impressions,clicks,enrollments,attributed_revenue,ctr,cpc,cpm,cpa,roas')
      .order('date', { ascending: true })
      .order('source_channel', { ascending: true });

    if (ymdStart) query = query.gte('date', ymdStart);
    if (ymdEnd) query = query.lte('date', ymdEnd);
    if (channelList && channelList.length > 0) query = query.in('source_channel', channelList);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching KPIs:', error);
      return NextResponse.json({ error: 'Failed to fetch KPIs', details: error.message }, { status: 500 });
    }

    const totals = (data ?? []).reduce((acc, row: any) => {
      acc.spend += Number(row.spend) || 0;
      acc.impressions += Number(row.impressions) || 0;
      acc.clicks += Number(row.clicks) || 0;
      acc.enrollments += Number(row.enrollments) || 0;
      acc.attributed_revenue += Number(row.attributed_revenue) || 0;
      return acc;
    }, { spend: 0, impressions: 0, clicks: 0, enrollments: 0, attributed_revenue: 0 });

    const summary = {
      spend: totals.spend,
      impressions: totals.impressions,
      clicks: totals.clicks,
      enrollments: totals.enrollments,
      attributed_revenue: totals.attributed_revenue,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) : null,
      cpc: totals.clicks > 0 ? (totals.spend / totals.clicks) : null,
      cpm: totals.impressions > 0 ? ((totals.spend / totals.impressions) * 1000) : null,
      cpa: totals.enrollments > 0 ? (totals.spend / totals.enrollments) : null,
      roas: totals.spend > 0 ? (totals.attributed_revenue / totals.spend) : null,
    };

    return NextResponse.json({ summary, timeseries: data ?? [], filters: { startDate: ymdStart ?? null, endDate: ymdEnd ?? null, channels: channelList ?? null } });
  } catch (err) {
    console.error('Unexpected error fetching KPIs:', err);
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json({ error: 'Unexpected server error', details: message }, { status: 500 });
  }
}
