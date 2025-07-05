import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    // Today's enrollments by acquisition source
    const todayEnrollmentsQuery = `
      SELECT 
        up.acquisition_source,
        COUNT(*) as enrollments_today
      FROM enrollments e
      JOIN unified_profiles up ON e.user_id = up.id
      WHERE DATE(e.enrolled_at) = CURRENT_DATE
      GROUP BY up.acquisition_source
      ORDER BY enrollments_today DESC
    `;

    // This month's enrollments by acquisition source
    const monthlyEnrollmentsQuery = `
      SELECT 
        up.acquisition_source,
        COUNT(*) as enrollments_this_month
      FROM enrollments e
      JOIN unified_profiles up ON e.user_id = up.id
      WHERE DATE_TRUNC('month', e.enrolled_at) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY up.acquisition_source
      ORDER BY enrollments_this_month DESC
    `;

    // Selected date range enrollments
    const dateRangeEnrollmentsQuery = `
      SELECT 
        up.acquisition_source,
        COUNT(*) as enrollments_in_range,
        DATE_TRUNC('day', e.enrolled_at) as enrollment_date
      FROM enrollments e
      JOIN unified_profiles up ON e.user_id = up.id
      WHERE e.enrolled_at >= $1::timestamp 
        AND e.enrolled_at <= $2::timestamp
      GROUP BY up.acquisition_source, DATE_TRUNC('day', e.enrolled_at)
      ORDER BY enrollment_date DESC, enrollments_in_range DESC
    `;

    // Recent enrollments with details
    const recentEnrollmentsQuery = `
      SELECT 
        e.id as enrollment_id,
        e.enrolled_at,
        e.status,
        up.id as user_id,
        up.email,
        up.first_name,
        up.last_name,
        up.acquisition_source,
        c.title as course_title,
        c.id as course_id
      FROM enrollments e
      JOIN unified_profiles up ON e.user_id = up.id
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.enrolled_at >= $1::timestamp 
        AND e.enrolled_at <= $2::timestamp
      ORDER BY e.enrolled_at DESC
      LIMIT 50
    `;

    // Execute all queries using direct SQL
    const [todayResult, monthlyResult, dateRangeResult, recentResult] = await Promise.all([
      supabase.from('enrollments')
        .select(`
          unified_profiles!inner(acquisition_source)
        `)
        .gte('enrolled_at', new Date().toISOString().split('T')[0])
        .lt('enrolled_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]),
      
      supabase.from('enrollments')
        .select(`
          unified_profiles!inner(acquisition_source)
        `)
        .gte('enrolled_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .lt('enrolled_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()),

      supabase.from('enrollments')
        .select(`
          *,
          unified_profiles!inner(acquisition_source)
        `)
        .gte('enrolled_at', startDate)
        .lte('enrolled_at', endDate),

      supabase.from('enrollments')
        .select(`
          id,
          enrolled_at,
          status,
          unified_profiles!inner(id, email, first_name, last_name, acquisition_source),
          courses(id, title)
        `)
        .gte('enrolled_at', startDate)
        .lte('enrolled_at', endDate)
        .order('enrolled_at', { ascending: false })
        .limit(50)
    ]);

    // Process results
    const todayEnrollments = todayResult.data || [];
    const monthlyEnrollments = monthlyResult.data || [];
    const dateRangeEnrollments = dateRangeResult.data || [];
    const recentEnrollments = recentResult.data || [];

    // Group today's enrollments by acquisition source
    const todayBySource = todayEnrollments.reduce((acc: any, enrollment: any) => {
      const source = enrollment.unified_profiles.acquisition_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // Group monthly enrollments by acquisition source
    const monthlyBySource = monthlyEnrollments.reduce((acc: any, enrollment: any) => {
      const source = enrollment.unified_profiles.acquisition_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // Calculate totals
    const totalEnrollmentsToday = todayEnrollments.length;
    const totalEnrollmentsThisMonth = monthlyEnrollments.length;
    const totalEnrollmentsInRange = dateRangeEnrollments.length;

    // Calculate trend vs previous period
    const previousPeriodStart = new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime()));
    const previousPeriodEnd = new Date(startDate);

    const previousPeriodResult = await supabase
      .from('enrollments')
      .select('id', { count: 'exact' })
      .gte('enrolled_at', previousPeriodStart.toISOString())
      .lte('enrolled_at', previousPeriodEnd.toISOString());

    const previousPeriodEnrollments = previousPeriodResult.count || 0;
    const trendPercentage = previousPeriodEnrollments > 0 
      ? ((totalEnrollmentsInRange - previousPeriodEnrollments) / previousPeriodEnrollments) * 100
      : totalEnrollmentsInRange > 0 ? 100 : 0;

    return NextResponse.json({
      summary: {
        totalEnrollmentsToday,
        totalEnrollmentsThisMonth,
        totalEnrollmentsInRange,
        previousPeriodEnrollments,
        trendPercentage: Math.round(trendPercentage * 10) / 10
      },
      todayBySource: Object.entries(todayBySource).map(([source, count]) => ({
        acquisition_source: source,
        enrollments_today: count
      })),
      monthlyBySource: Object.entries(monthlyBySource).map(([source, count]) => ({
        acquisition_source: source,
        enrollments_this_month: count
      })),
      dateRangeEnrollments,
      recentEnrollments: recentEnrollments.map((enrollment: any) => ({
        enrollment_id: enrollment.id,
        enrolled_at: enrollment.enrolled_at,
        status: enrollment.status,
        user_id: enrollment.unified_profiles.id,
        email: enrollment.unified_profiles.email,
        acquisition_source: enrollment.unified_profiles.acquisition_source,
        course_title: enrollment.courses?.title || 'Unknown Course',
        course_id: enrollment.courses?.id,
        userName: `${enrollment.unified_profiles.first_name || ''} ${enrollment.unified_profiles.last_name || ''}`.trim() || enrollment.unified_profiles.id
      }))
    });

  } catch (error: any) {
    console.error('Error fetching enrollment metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment metrics', details: error.message },
      { status: 500 }
    );
  }
} 