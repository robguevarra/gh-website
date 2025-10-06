import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = await validateAdminStatus(user.id);
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Helper to read bounds using order+limit, with optional equality filter
  const getBounds = async (table: string, eq?: { column: string; value: string }) => {
    let qbMin = supabase.from(table).select('date').order('date', { ascending: true }).limit(1);
    let qbMax = supabase.from(table).select('date').order('date', { ascending: false }).limit(1);
    if (eq) {
      qbMin = qbMin.eq(eq.column as any, eq.value as any);
      qbMax = qbMax.eq(eq.column as any, eq.value as any);
    }
    const { data: minRows } = await qbMin;
    const { data: maxRows } = await qbMax;
    const minDate = minRows && minRows[0]?.date ? String(minRows[0].date) : null;
    const maxDate = maxRows && maxRows[0]?.date ? String(maxRows[0].date) : null;
    return { minDate, maxDate };
  };

  // Prefer bounds from performance view (facebook only)
  let source: 'perf' | 'ad_spend' | 'kpi' | 'none' = 'none';
  let { minDate, maxDate } = await getBounds('marketing_performance_view', { column: 'source_channel', value: 'facebook' });
  if (minDate && maxDate) source = 'perf';

  // Fallback to ad_spend
  if (!maxDate) {
    const s = await getBounds('ad_spend');
    if (s.minDate && s.maxDate) {
      minDate = s.minDate;
      maxDate = s.maxDate;
      source = 'ad_spend';
    }
  }

  // Fallback to KPI matview
  if (!maxDate) {
    const kpi = await getBounds('marketing_kpis_channel_daily');
    if (kpi.minDate && kpi.maxDate) {
      minDate = kpi.minDate;
      maxDate = kpi.maxDate;
      source = 'kpi';
    }
  }

  return NextResponse.json({ minDate, maxDate, source });
}
