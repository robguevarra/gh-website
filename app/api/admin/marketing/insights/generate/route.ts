import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';

const bodySchema = z.object({
  startDate: z.string().optional(), // ISO
  endDate: z.string().optional(),   // ISO
  channels: z.array(z.string()).optional(),
  prompt: z.string().optional(),
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

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = await validateAdminStatus(user.id);
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Body
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parsed.error.errors }, { status: 400 });
  }

  const { startDate, endDate, channels, prompt } = parsed.data;
  const ymdStart = toYmd(startDate);
  const ymdEnd = toYmd(endDate);
  if (ymdStart && ymdEnd && ymdStart > ymdEnd) {
    return NextResponse.json({ error: 'Invalid date range: startDate must be <= endDate' }, { status: 400 });
  }

  try {
    // Build KPI snapshot from materialized view
    let query = supabase
      .from('marketing_kpis_channel_daily')
      .select('date,source_channel,spend,impressions,clicks,enrollments,attributed_revenue,ctr,cpc,cpm,cpa,roas')
      .order('date', { ascending: true })
      .order('source_channel', { ascending: true });

    if (ymdStart) query = query.gte('date', ymdStart);
    if (ymdEnd) query = query.lte('date', ymdEnd);
    if (channels && channels.length > 0) query = query.in('source_channel', channels);

    const { data, error } = await query;
    if (error) {
      console.error('Error building KPI snapshot:', error);
      return NextResponse.json({ error: 'Failed to compile KPI snapshot', details: error.message }, { status: 500 });
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

    // Stubbed analysis output for now; provider integration later
    const analysis = `Summary: Spend=${summary.spend.toFixed(2)}, Clicks=${summary.clicks}, Imps=${summary.impressions}, Enrollments=${summary.enrollments}. CTR=${summary.ctr?.toFixed(4) ?? 'n/a'}, CPC=${summary.cpc?.toFixed(2) ?? 'n/a'}, CPM=${summary.cpm?.toFixed(2) ?? 'n/a'}, CPA=${summary.cpa?.toFixed(2) ?? 'n/a'}, ROAS=${summary.roas?.toFixed(2) ?? 'n/a'}.`;

    const filters = { startDate: ymdStart ?? null, endDate: ymdEnd ?? null, channels: channels ?? null };
    const snapshot = { summary, timeseries: data ?? [] };

    const { data: inserted, error: insertError } = await supabase
      .from('marketing_insights')
      .insert({
        created_by: user.id,
        filters,
        metrics_snapshot: snapshot,
        model: 'stub:rules-based',
        provider: 'internal',
        prompt: prompt ?? null,
        output: analysis,
        status: 'completed',
      })
      .select('*')
      .limit(1);

    if (insertError) {
      console.error('Error inserting marketing insight:', insertError);
      return NextResponse.json({ error: 'Failed to save insight', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ data: inserted?.[0] ?? null });
  } catch (err) {
    console.error('Unexpected error generating insight:', err);
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json({ error: 'Unexpected server error', details: message }, { status: 500 });
  }
}
