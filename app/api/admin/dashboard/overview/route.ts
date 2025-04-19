import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';

// --- Type Definitions ---
type SummaryMetrics = {
  totalEnrollments: number;
  totalRevenue: number;
  conversionRate: number;
  activeUsers: number;
  previousPeriod: {
    totalEnrollments: number;
    totalRevenue: number;
    conversionRate: number;
    activeUsers: number;
  };
  percentChange: {
    totalEnrollments: number;
    totalRevenue: number;
    conversionRate: number;
    activeUsers: number;
  };
};

type TrendPoint = { date: string; count?: number; amount?: number };

type RecentEnrollment = {
  user: { id: string; first_name?: string; last_name?: string };
  course: { id: string; title?: string };
  enrolledAt: string;
};

type RecentPayment = {
  user: { id: string; first_name?: string; last_name?: string };
  amount: number;
  paidAt: string;
  method?: string;
  transactionType?: string;
};

type PerformanceSummary = {
  current: number;
  previous: number;
  percentChange: number;
};

type DateRange = {
  current: { start: Date; end: Date };
  previous: { start: Date; end: Date };
};

// --- Utilities ---

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function parseDateParam(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatISODate(date: Date, monthIso = false): string {
  const base = date.toISOString().slice(0, 10);
  return monthIso ? `${base.slice(0, 7)}-01` : base;
}

function generatePeriods(
  start: Date,
  end: Date,
  granularity: 'day' | 'week' | 'month'
): string[] {
  const periods: string[] = [];
  if (granularity === 'day') {
    for (let dt = new Date(start); dt <= end; dt.setUTCDate(dt.getUTCDate() + 1)) {
      periods.push(dt.toISOString().slice(0, 10));
    }
  } else if (granularity === 'week') {
    const first = new Date(start);
    const wd = first.getUTCDay();
    first.setUTCDate(first.getUTCDate() + ((wd === 0 ? -6 : 1) - wd));
    for (let dt = first; dt <= end; dt.setUTCDate(dt.getUTCDate() + 7)) {
      periods.push(dt.toISOString().slice(0, 10));
    }
  } else {
    for (
      let dt = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      dt <= end;
      dt = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1))
    ) {
      periods.push(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`);
    }
  }
  return periods;
}

function calculateDateRanges(url: URL): {
  range: DateRange;
  granularity: 'day' | 'week' | 'month';
} {
  const params = url.searchParams;
  const startParam = parseDateParam(params.get('startDate') ?? '');
  const endParam = parseDateParam(params.get('endDate') ?? '');

  const now = new Date();
  const currentStart = startParam || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const currentEnd = endParam || now;
  const msSpan = currentEnd.getTime() - currentStart.getTime() + 1;
  const days = Math.ceil(msSpan / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(currentStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000 + 1);

  let granularity: 'day' | 'week' | 'month' = 'month';
  if (days <= 31) granularity = 'day';
  else if (days <= 90) granularity = 'week';

  return {
    range: {
      current: { start: currentStart, end: currentEnd },
      previous: { start: prevStart, end: prevEnd }
    },
    granularity
  };
}

// --- Data Fetchers ---

async function fetchSummaryMetrics(
  admin: SupabaseClient,
  dr: DateRange
): Promise<SummaryMetrics> {
  // Parallel enrollments
  const [
    { count: totalEnrollments = 0, error: errE1 },
    { count: prevEnrollments = 0, error: errE2 }
  ] = await Promise.all([
    admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .gte('enrolled_at', dr.current.start.toISOString())
      .lte('enrolled_at', dr.current.end.toISOString()),
    admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .gte('enrolled_at', dr.previous.start.toISOString())
      .lte('enrolled_at', dr.previous.end.toISOString())
  ]);
  if (errE1 || errE2) throw errE1 || errE2;

  // Parallel revenues
  const [
    { data: revThis = [], error: errR1 },
    { data: revPrev = [], error: errR2 }
  ] = await Promise.all([
    admin
      .from('transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', dr.current.start.toISOString())
      .lte('created_at', dr.current.end.toISOString()),
    admin
      .from('transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', dr.previous.start.toISOString())
      .lte('created_at', dr.previous.end.toISOString())
  ]);
  if (errR1 || errR2) throw errR1 || errR2;

  const totalRevenue = revThis.reduce((sum, r) => sum + (r.amount || 0), 0);
  const previousRevenue = revPrev.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Conversion rate
  const { data: msArr = [], error: errM } = await admin
    .from('marketing_source_view')
    .select('user_count, paid_user_count');
  if (errM) throw errM;
  const totalUserCount = msArr && msArr.length > 0 ? msArr.reduce((sum, row) => sum + (row.user_count || 0), 0) : 0;
  const totalPaidUserCount = msArr && msArr.length > 0 ? msArr.reduce((sum, row) => sum + (row.paid_user_count || 0), 0) : 0;
  const conversionRate = totalUserCount ? (totalPaidUserCount / totalUserCount) * 100 : 0;
  const prevConversionRate = 0; // plug in bounded view when available

  // Active users
  const [
    { count: activeUsers = 0, error: errA1 },
    { count: prevActive = 0, error: errA2 }
  ] = await Promise.all([
    admin
      .from('enrollments')
      .select('user_id', { count: 'exact', head: true })
      .gte('enrolled_at', dr.current.start.toISOString())
      .lte('enrolled_at', dr.current.end.toISOString()),
    admin
      .from('enrollments')
      .select('user_id', { count: 'exact', head: true })
      .gte('enrolled_at', dr.previous.start.toISOString())
      .lte('enrolled_at', dr.previous.end.toISOString())
  ]);
  if (errA1 || errA2) throw errA1 || errA2;

  return {
    totalEnrollments: totalEnrollments ?? 0,
    totalRevenue: totalRevenue ?? 0,
    conversionRate: conversionRate ?? 0,
    activeUsers: activeUsers ?? 0,
    previousPeriod: {
      totalEnrollments: prevEnrollments ?? 0,
      totalRevenue: previousRevenue ?? 0,
      conversionRate: prevConversionRate ?? 0,
      activeUsers: prevActive ?? 0
    },
    percentChange: {
      totalEnrollments: percentChange(totalEnrollments ?? 0, prevEnrollments ?? 0),
      totalRevenue: percentChange(totalRevenue ?? 0, previousRevenue ?? 0),
      conversionRate: percentChange(conversionRate ?? 0, prevConversionRate ?? 0),
      activeUsers: percentChange(activeUsers ?? 0, prevActive ?? 0)
    }
  };
}

async function fetchEnrollmentTrends(
  admin: SupabaseClient,
  dr: DateRange,
  granularity: 'day' | 'week' | 'month'
): Promise<TrendPoint[]> {
  console.log('[fetchEnrollmentTrends] parameters:', {
    start: dr.current.start.toISOString(),
    end: dr.current.end.toISOString(),
    granularity
  });

  const periods = generatePeriods(dr.current.start, dr.current.end, granularity);
  const periodMapKeyFormat = granularity === 'month' ? 'YYYY-MM-01' : 'YYYY-MM-DD';

  if (granularity === 'month') {
    // --- Use Database RPC for Monthly Aggregation ---
    const { data: monthlyData = [], error: rpcError } = await admin.rpc(
      'get_monthly_enrollment_trends',
      {
        p_start_date: dr.current.start.toISOString(),
        p_end_date: dr.current.end.toISOString()
      }
    );

    if (rpcError) {
      console.error('RPC get_monthly_enrollment_trends error:', rpcError);
      throw rpcError;
    }
    console.log('[fetchEnrollmentTrends] RPC result count:', monthlyData?.length ?? 0);

    const counts: Record<string, number> = (monthlyData || []).reduce(
      (acc: Record<string, number>, row: any) => {
        // Ensure month_start is treated as UTC date string 'YYYY-MM-DD'
        const monthKey = row.month_start.slice(0, 10);
        acc[monthKey] = Number(row.enrollment_count || 0);
        return acc;
      },
      {}
    );
    console.log('[fetchEnrollmentTrends] monthly counts map:', counts);

    // Map generated periods to the RPC results
    return periods.map((p) => {
      const dateKey = `${p}-01`; // Format period to match RPC output key 'YYYY-MM-01'
      return { date: dateKey, count: counts[dateKey] || 0 };
    });
  } else {
    // --- Keep original logic for Day/Week Granularity ---
    const { data = [] as any[], error } = await admin
      .from('enrollments')
      .select('enrolled_at')
      .gte('enrolled_at', dr.current.start.toISOString())
      .lte('enrolled_at', dr.current.end.toISOString());
    if (error) throw error;

    console.log('[fetchEnrollmentTrends] fetched rows count:', data?.length ?? 0);

    const counts: Record<string, number> = {};
    (data || []).forEach(({ enrolled_at }) => {
      const dt = new Date(enrolled_at);
      let key: string;
      if (granularity === 'week') {
        const monday = new Date(dt);
        const wd = monday.getUTCDay();
        monday.setUTCDate(monday.getUTCDate() + ((wd === 0 ? -6 : 1) - wd));
        key = formatISODate(monday);
      } else { // day
        key = formatISODate(dt);
      }
      counts[key] = (counts[key] || 0) + 1;
    });

    console.log('[fetchEnrollmentTrends] counts map:', counts);
    console.log('[fetchEnrollmentTrends] generated periods:', periods);

    return periods.map((date) => ({ date, count: counts[date] || 0 }));
  }
}

async function fetchRevenueTrends(
  admin: SupabaseClient,
  dr: DateRange,
  granularity: 'day' | 'week' | 'month'
): Promise<TrendPoint[]> {
  console.log('[fetchRevenueTrends] parameters:', {
    start: dr.current.start.toISOString(),
    end: dr.current.end.toISOString(),
    granularity
  });

  const periods = generatePeriods(dr.current.start, dr.current.end, granularity);
  const periodMapKeyFormat = granularity === 'month' ? 'YYYY-MM-01' : 'YYYY-MM-DD';

  if (granularity === 'month') {
    // --- Use Database RPC for Monthly Aggregation ---
    const { data: monthlyData = [], error: rpcError } = await admin.rpc(
      'get_monthly_revenue_trends',
      {
        p_start_date: dr.current.start.toISOString(),
        p_end_date: dr.current.end.toISOString()
      }
    );

    if (rpcError) {
      console.error('RPC get_monthly_revenue_trends error:', rpcError);
      throw rpcError;
    }
    console.log('[fetchRevenueTrends] RPC result count:', monthlyData?.length ?? 0);

    const sums: Record<string, number> = (monthlyData || []).reduce(
      (acc: Record<string, number>, row: any) => {
         // Ensure month_start is treated as UTC date string 'YYYY-MM-DD'
         const monthKey = row.month_start.slice(0, 10);
        acc[monthKey] = Number(row.total_revenue || 0);
        return acc;
      },
      {}
    );
     console.log('[fetchRevenueTrends] monthly sums map:', sums);

    // Map generated periods to the RPC results
    return periods.map((p) => {
       const dateKey = `${p}-01`; // Format period to match RPC output key 'YYYY-MM-01'
      return { date: dateKey, amount: sums[dateKey] || 0 };
    });
  } else {
     // --- Keep original logic for Day/Week Granularity ---
    const { data = [] as any[], error } = await admin
      .from('transactions')
      .select('paid_at, amount')
      .eq('status', 'completed')
      .gte('paid_at', dr.current.start.toISOString())
      .lte('paid_at', dr.current.end.toISOString());
    if (error) throw error;

    console.log('[fetchRevenueTrends] fetched rows count:', data?.length ?? 0);

    const sums: Record<string, number> = {};
    (data || []).forEach(({ paid_at, amount }) => {
      const dt = new Date(paid_at);
      let key: string;
      if (granularity === 'week') {
        const monday = new Date(dt);
        const wd = monday.getUTCDay();
        monday.setUTCDate(monday.getUTCDate() + ((wd === 0 ? -6 : 1) - wd));
        key = formatISODate(monday);
      } else { // day
        key = formatISODate(dt);
      }
      sums[key] = (sums[key] || 0) + (amount || 0);
    });

     console.log('[fetchRevenueTrends] sums map:', sums);
     console.log('[fetchRevenueTrends] generated periods:', periods);

    return periods.map((date) => ({ date, amount: sums[date] || 0 }));
  }
}

async function fetchRecentActivity(
  admin: SupabaseClient,
  dr: DateRange
): Promise<{ enrollments: RecentEnrollment[]; payments: RecentPayment[] }> {
  // Recent Enrollments
  const { data: er = [] as any[], error: erErr } = await admin
    .from('enrollments')
    .select(
      `user_id, course_id, enrolled_at, unified_profiles!user_id(first_name, last_name), courses!course_id(title)`
    )
    .order('enrolled_at', { ascending: false })
    .limit(10)
    .gte('enrolled_at', dr.current.start.toISOString())
    .lte('enrolled_at', dr.current.end.toISOString());
  if (erErr) throw erErr;

  const enrollments: RecentEnrollment[] = (er || []).map((r: any) => ({
    user: {
      id: r.user_id,
      first_name: r.unified_profiles?.first_name,
      last_name: r.unified_profiles?.last_name
    },
    course: { id: r.course_id, title: r.courses?.title },
    enrolledAt: r.enrolled_at
  }));

  // Recent Payments
  const { data: pr = [] as any[], error: prErr } = await admin
    .from('transactions')
    .select('user_id, amount, payment_method, paid_at, transaction_type')
    .eq('status', 'completed')
    .order('paid_at', { ascending: false })
    .limit(10)
    .gte('paid_at', dr.current.start.toISOString())
    .lte('paid_at', dr.current.end.toISOString());
  if (prErr) throw prErr;

  const userIds = Array.from(new Set((pr || []).map((p) => p.user_id)));
  const { data: profiles = [] as any[] } = await admin
    .from('unified_profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  const profileMap = (profiles || []).reduce((acc: any, p: any) => {
    acc[p.id] = { first_name: p.first_name, last_name: p.last_name };
    return acc;
  }, {} as Record<string, { first_name?: string; last_name?: string }>);

  const payments: RecentPayment[] = (pr || []).map((r: any) => ({
    user: { id: r.user_id, ...profileMap[r.user_id] },
    amount: r.amount,
    paidAt: r.paid_at,
    method: r.payment_method,
    transactionType: r.transaction_type
  }));

  return { enrollments, payments };
}

// --- Main Handler ---

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminClient();
    const { range, granularity } = calculateDateRanges(new URL(req.url));

    const [
      summaryMetrics,
      enrollmentTrends,
      revenueTrends,
      recentActivity
    ] = await Promise.all([
      fetchSummaryMetrics(admin, range),
      fetchEnrollmentTrends(admin, range, granularity),
      fetchRevenueTrends(admin, range, granularity),
      fetchRecentActivity(admin, range)
    ]);

    const performanceSummaries = {
      enrollments: {
        current: summaryMetrics.totalEnrollments,
        previous: summaryMetrics.previousPeriod.totalEnrollments,
        percentChange: summaryMetrics.percentChange.totalEnrollments
      },
      revenue: {
        current: summaryMetrics.totalRevenue,
        previous: summaryMetrics.previousPeriod.totalRevenue,
        percentChange: summaryMetrics.percentChange.totalRevenue
      },
      conversionRate: {
        current: summaryMetrics.conversionRate,
        previous: summaryMetrics.previousPeriod.conversionRate,
        percentChange: summaryMetrics.percentChange.conversionRate
      },
      activeUsers: {
        current: summaryMetrics.activeUsers,
        previous: summaryMetrics.previousPeriod.activeUsers,
        percentChange: summaryMetrics.percentChange.activeUsers
      }
    };

    return NextResponse.json({
      summaryMetrics,
      enrollmentTrends,
      revenueTrends,
      trendGranularity: granularity,
      recentActivity,
      performanceSummaries
    });
  } catch (error: any) {
    console.error('Dashboard Overview API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard overview metrics' },
      { status: 500 }
    );
  }
}