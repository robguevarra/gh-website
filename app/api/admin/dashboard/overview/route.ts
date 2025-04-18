import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// This API endpoint provides real business intelligence metrics for the admin dashboard Overview section.
// It aggregates summary metrics, trend data, recent activity, and performance summaries from the unified analytics views and tables.
// All queries should use the unified schema: enrollments, transactions, unified_profiles, and analytics views.
// This endpoint is modular, extensible, and follows industry best practice.

// --- Type Definitions for API Response ---
// These types ensure clarity and prevent implicit 'any' errors.

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
  user: Record<string, unknown>;
  course: Record<string, unknown>;
  enrolledAt: string;
};

type RecentPayment = {
  user: Record<string, unknown>;
  amount: number;
  paidAt: string;
  method?: string;
};

type PerformanceSummary = {
  current: number;
  previous: number;
  percentChange: number;
};

// --- Helper Functions ---
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// --- Helper to parse date from query param safely ---
function parseDateParam(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// --- Main API Handler ---
export async function GET(req: NextRequest) {
  const admin = getAdminClient();
  try {
    // --- 0. Parse date range from query params ---
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startDate = parseDateParam(startDateParam);
    const endDate = parseDateParam(endDateParam);

    // --- 1. Summary Metrics ---
    // If no date range, use default: this month for summary, last month for previous period
    const now = new Date();
    const summaryStart = startDate || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const summaryEnd = endDate || now;
    // Previous period: same length, immediately before selected range
    const rangeDays = Math.ceil((summaryEnd.getTime() - summaryStart.getTime()) / (1000 * 60 * 60 * 24));
    const prevEnd = new Date(summaryStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    // 1.1 Total Enrollments (selected range, previous range)
    const { data: enrollmentsThis, error: enrollmentsThisError } = await admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .gte('enrolled_at', summaryStart.toISOString())
      .lte('enrolled_at', summaryEnd.toISOString());
    const { data: enrollmentsPrev, error: enrollmentsPrevError } = await admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .gte('enrolled_at', prevStart.toISOString())
      .lte('enrolled_at', prevEnd.toISOString());
    const totalEnrollments = enrollmentsThis?.length ?? 0;
    const prevEnrollments = enrollmentsPrev?.length ?? 0;

    // 1.2 Total Revenue (selected range, previous range)
    const { data: revenueThis, error: revenueThisError } = await admin
      .from('transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', summaryStart.toISOString())
      .lte('created_at', summaryEnd.toISOString());
    const { data: revenuePrev, error: revenuePrevError } = await admin
      .from('transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString());
    const totalRevenue = revenueThis?.reduce((sum, t) => sum + (t.amount || 0), 0) ?? 0;
    const prevRevenue = revenuePrev?.reduce((sum, t) => sum + (t.amount || 0), 0) ?? 0;

    // 1.3 Conversion Rate (for selected range, fallback to 0)
    // NOTE: This is a placeholder. For real time-based conversion, use a time-bounded view.
    const { data: marketingSource } = await admin
      .from('marketing_source_view')
      .select('user_count, paid_user_count')
      .maybeSingle();
    const conversionRate = marketingSource && marketingSource.user_count
      ? (marketingSource.paid_user_count / marketingSource.user_count) * 100
      : 0;
    const prevConversionRate = 0; // Not time-bounded yet

    // 1.4 Active Users (selected range, previous range)
    const { data: activeUsers } = await admin
      .from('enrollments')
      .select('user_id', { count: 'exact', head: true })
      .gte('enrolled_at', summaryStart.toISOString())
      .lte('enrolled_at', summaryEnd.toISOString());
    const { data: prevActiveUsers } = await admin
      .from('enrollments')
      .select('user_id', { count: 'exact', head: true })
      .gte('enrolled_at', prevStart.toISOString())
      .lte('enrolled_at', prevEnd.toISOString());
    const activeUsersCount = activeUsers?.length ?? 0;
    const prevActiveUsersCount = prevActiveUsers?.length ?? 0;

    const summaryMetrics: SummaryMetrics = {
      totalEnrollments,
      totalRevenue,
      conversionRate,
      activeUsers: activeUsersCount,
      previousPeriod: {
        totalEnrollments: prevEnrollments,
        totalRevenue: prevRevenue,
        conversionRate: prevConversionRate,
        activeUsers: prevActiveUsersCount,
      },
      percentChange: {
        totalEnrollments: percentChange(totalEnrollments, prevEnrollments),
        totalRevenue: percentChange(totalRevenue, prevRevenue),
        conversionRate: percentChange(conversionRate, prevConversionRate),
        activeUsers: percentChange(activeUsersCount, prevActiveUsersCount),
      },
    };

    // --- 2. Trend Data ---
    // Trends: filter by month >= startDate and <= endDate if provided
    const trendStart = startDate
      ? new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const trendEnd = endDate
      ? new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1))
      : now;
    // Enrollment Trends
    let { data: enrollmentTrendsRaw } = await admin
      .from('monthly_enrollments_view')
      .select('month, enrollment_count')
      .order('month', { ascending: true });
    enrollmentTrendsRaw = (enrollmentTrendsRaw || []).filter((row: any) => {
      const m = new Date(row.month);
      return m >= trendStart && m <= trendEnd;
    });
    const enrollmentTrends: TrendPoint[] = (enrollmentTrendsRaw || []).map((row: any) => ({
      date: row.month,
      count: row.enrollment_count,
    }));
    // Revenue Trends
    let { data: revenueTrendsRaw } = await admin
      .from('revenue_analysis_view')
      .select('month, total_revenue')
      .order('month', { ascending: true });
    revenueTrendsRaw = (revenueTrendsRaw || []).filter((row: any) => {
      const m = new Date(row.month);
      return m >= trendStart && m <= trendEnd;
    });
    const revenueTrends: TrendPoint[] = (revenueTrendsRaw || []).map((row: any) => ({
      date: row.month,
      amount: row.total_revenue,
    }));

    // --- 3. Recent Activity ---
    // Filter by selected date range if provided
    const recentEnrollmentsQuery = admin
      .from('enrollments')
      .select('id, user_id, course_id, enrolled_at')
      .order('enrolled_at', { ascending: false })
      .limit(10);
    if (startDate) recentEnrollmentsQuery.gte('enrolled_at', summaryStart.toISOString());
    if (endDate) recentEnrollmentsQuery.lte('enrolled_at', summaryEnd.toISOString());
    const { data: recentEnrollmentsRaw } = await recentEnrollmentsQuery;
    const recentEnrollments: RecentEnrollment[] = (recentEnrollmentsRaw || []).map((row: any) => ({
      user: { id: row.user_id },
      course: { id: row.course_id },
      enrolledAt: row.enrolled_at,
    }));
    const recentPaymentsQuery = admin
      .from('transactions')
      .select('id, user_id, amount, payment_method, paid_at')
      .eq('status', 'completed')
      .order('paid_at', { ascending: false })
      .limit(10);
    if (startDate) recentPaymentsQuery.gte('paid_at', summaryStart.toISOString());
    if (endDate) recentPaymentsQuery.lte('paid_at', summaryEnd.toISOString());
    const { data: recentPaymentsRaw } = await recentPaymentsQuery;
    const recentPayments: RecentPayment[] = (recentPaymentsRaw || []).map((row: any) => ({
      user: { id: row.user_id },
      amount: row.amount,
      paidAt: row.paid_at,
      method: row.payment_method,
    }));

    // --- 4. Performance Summaries ---
    const performanceSummaries = {
      enrollments: {
        current: totalEnrollments,
        previous: prevEnrollments,
        percentChange: percentChange(totalEnrollments, prevEnrollments),
      },
      revenue: {
        current: totalRevenue,
        previous: prevRevenue,
        percentChange: percentChange(totalRevenue, prevRevenue),
      },
      conversionRate: {
        current: conversionRate,
        previous: prevConversionRate,
        percentChange: percentChange(conversionRate, prevConversionRate),
      },
      activeUsers: {
        current: activeUsersCount,
        previous: prevActiveUsersCount,
        percentChange: percentChange(activeUsersCount, prevActiveUsersCount),
      },
    };

    // --- 5. Compose and return response ---
    return NextResponse.json({
      summaryMetrics,
      enrollmentTrends,
      revenueTrends,
      recentActivity: {
        enrollments: recentEnrollments,
        payments: recentPayments,
      },
      performanceSummaries,
    });
  } catch (error) {
    console.error('Dashboard Overview API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard overview metrics' },
      { status: 500 }
    );
  }
} 