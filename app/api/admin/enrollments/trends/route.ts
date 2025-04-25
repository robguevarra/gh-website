import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';
import { startOfMonth, endOfMonth, formatISO } from 'date-fns';

type Granularity = 'day' | 'week' | 'month';

// Define the structure for the trend response items
interface TrendDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number;
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

  // 2. Get Parameters (Date Range, Granularity)
  const currentDate = new Date();
  const defaultStartDate = formatISO(startOfMonth(currentDate));
  const defaultEndDate = formatISO(endOfMonth(currentDate));

  const startDateParam = searchParams.get('startDate') || defaultStartDate;
  const endDateParam = searchParams.get('endDate') || defaultEndDate;
  const granularity = (searchParams.get('granularity') || 'day') as Granularity;

  // Validate date parameters
  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // Ensure end date includes the whole day
  endDate.setHours(23, 59, 59, 999);

  // Validate granularity
  if (!['day', 'week', 'month'].includes(granularity)) {
    return NextResponse.json({ error: 'Invalid granularity specified' }, { status: 400 });
  }

  // Use hardcoded P2P Course ID
  const p2pCourseId = '7e386720-8839-4252-bd5f-09a33c3e1afb';

  try {
    // 3. Call the appropriate RPC function based on granularity
    let rpcFunctionName:
      | 'get_daily_p2p_enrollment_trends'
      | 'get_weekly_p2p_enrollment_trends'
      | 'get_monthly_p2p_enrollment_trends';
    let dateFieldName: string;

    switch (granularity) {
      case 'week':
        rpcFunctionName = 'get_weekly_p2p_enrollment_trends';
        dateFieldName = 'week_start_date';
        break;
      case 'month':
        rpcFunctionName = 'get_monthly_p2p_enrollment_trends';
        dateFieldName = 'month_start_date';
        break;
      case 'day':
      default:
        rpcFunctionName = 'get_daily_p2p_enrollment_trends';
        dateFieldName = 'date';
        break;
    }

    // Call RPC function
    const { data: trendsData, error } = await supabase.rpc(rpcFunctionName as any, {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      target_course_id: p2pCourseId,
    });

    if (error) throw error;

    // Format the response - Assert type for data until types are regenerated
    const formattedTrends: TrendDataPoint[] = ((trendsData as any[]) || []).map((item: any) => ({
      date: item[dateFieldName], // Access date using dynamic field name
      count: Number(item.count) || 0, // Ensure count is a number
    }));

    return NextResponse.json(formattedTrends);

  } catch (error) {
    console.error('Error fetching enrollment trends:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to fetch enrollment trends', details: errorMessage }, { status: 500 });
  }
} 