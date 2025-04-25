import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';
import { subMonths, startOfMonth, endOfMonth, formatISO } from 'date-fns';

// Define the structure for the summary response
interface EnrollmentSummary {
  totalEnrollments: number;
  activeEnrollments: number;
  totalEnrollmentsPrevPeriod: number;
  activeEnrollmentsPrevPeriod: number;
  totalTrendPercentage: number | null;
  activeTrendPercentage: number | null;
}

// Helper to calculate percentage change, handling division by zero
function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    // If previous was 0, change is infinite (or 100% if current > 0, 0% if current is 0)
    // Return null or a specific large number depending on desired representation
    return current > 0 ? 100 : 0; // Representing as 100% increase if starting from 0
  }
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  // 1. Check admin authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdmin = await validateAdminStatus(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // 2. Get Date Range Parameters (Default to current month)
  const currentDate = new Date();
  const defaultStartDate = formatISO(startOfMonth(currentDate));
  const defaultEndDate = formatISO(endOfMonth(currentDate));

  const startDateParam = searchParams.get('startDate') || defaultStartDate;
  const endDateParam = searchParams.get('endDate') || defaultEndDate;

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // **Use UTC hours to ensure end date includes the whole day consistently**
  endDate.setUTCHours(23, 59, 59, 999);

  // Calculate previous period dates (assuming same duration ending before start date)
  const duration = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1); // Day before start date
  // **Use UTC hours for previous end date as well**
  prevEndDate.setUTCHours(23, 59, 59, 999);
  const prevStartDate = new Date(prevEndDate.getTime() - duration);

  // Use hardcoded P2P Course ID
  const p2pCourseId = '7e386720-8839-4252-bd5f-09a33c3e1afb';

  try {
    // 3. Fetch enrollment counts for the current and previous periods
    const fetchEnrollments = async (start: Date, end: Date) => {
      const { data, error, count } = await supabase
        .from('enrollments')
        .select('id, status', { count: 'exact' })
        .eq('course_id', p2pCourseId)
        .gte('enrolled_at', start.toISOString())
        .lte('enrolled_at', end.toISOString());
      
      if (error) throw error;
      
      const total = count ?? 0;
      const active = data?.filter(e => e.status === 'active').length ?? 0;
      return { total, active };
    };

    const currentPeriodData = await fetchEnrollments(startDate, endDate);
    const previousPeriodData = await fetchEnrollments(prevStartDate, prevEndDate);

    // 4. Calculate trends
    const totalTrend = calculatePercentageChange(currentPeriodData.total, previousPeriodData.total);
    const activeTrend = calculatePercentageChange(currentPeriodData.active, previousPeriodData.active);

    // 5. Prepare response
    const summary: EnrollmentSummary = {
      totalEnrollments: currentPeriodData.total,
      activeEnrollments: currentPeriodData.active,
      totalEnrollmentsPrevPeriod: previousPeriodData.total,
      activeEnrollmentsPrevPeriod: previousPeriodData.active,
      totalTrendPercentage: totalTrend,
      activeTrendPercentage: activeTrend,
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error fetching enrollment summary:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to fetch enrollment summary', details: errorMessage }, { status: 500 });
  }
} 