import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';
import { startOfMonth, endOfMonth, formatISO } from 'date-fns';

// Define the structure for the funnel response
interface FunnelStage {
  stageName: string;
  count: number;
}

interface EnrollmentFunnel {
  source: string; // e.g., 'all', 'organic_tag'
  stages: FunnelStage[];
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

  // 2. Get Parameters (Date Range, Source Filter)
  const currentDate = new Date();
  // Default to last 3 months for funnel view? Or current month?
  // Let's default to the current month for consistency for now.
  const defaultStartDate = formatISO(startOfMonth(currentDate));
  const defaultEndDate = formatISO(endOfMonth(currentDate));

  const startDateParam = searchParams.get('startDate') || defaultStartDate;
  const endDateParam = searchParams.get('endDate') || defaultEndDate;
  const sourceFilter = searchParams.get('source') || 'all'; // e.g., 'all', 'organic_tag'

  // Validate date parameters
  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // Ensure end date includes the whole day
  endDate.setHours(23, 59, 59, 999);

  // Use hardcoded P2P Course ID
  const p2pCourseId = '7e386720-8839-4252-bd5f-09a33c3e1afb';

  try {
    // 3. Fetch data for each funnel stage
    const funnelStages: FunnelStage[] = [];
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    const targetTag = 'squeeze'; // Assuming 'squeeze' tag signifies P2P lead/visitor

    // Stage 1: Potential Leads/Visitors (using tags)
    let leadQuery = supabase
      .from('unified_profiles')
      .select('id', { count: 'exact', head: true })
      // Filter by creation date or a specific interaction date if available?
      // Using created_at for now as a proxy for when they entered the system.
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    if (sourceFilter === 'organic_tag') {
      // Check if tags array contains the target tag
      leadQuery = leadQuery.contains('tags', [targetTag]);
    } else {
        // For 'all' source, potentially include users with the tag OR no tags?
        // This definition might need refinement based on business logic.
        // For now, 'all' includes everyone created in the period.
    }
    const { count: leadCount, error: leadError } = await leadQuery;
    if (leadError) throw leadError;
    funnelStages.push({ stageName: 'Potential Leads/Visitors', count: leadCount ?? 0 });

    // Stage 2: Transaction Initiated (Pending)
    // Requires joining transactions to profiles to filter by tag if needed
    let pendingTxQuery = supabase
      .from('transactions')
      .select('id, unified_profiles(tags)', { count: 'exact' })
      .eq('status', 'pending')
      .gte('created_at', startTime)
      .lte('created_at', endTime);
      // Filter potentially by transaction_type if relevant for P2P

    if (sourceFilter === 'organic_tag') {
        pendingTxQuery = pendingTxQuery.contains('unified_profiles.tags', [targetTag]);
    }
    const { count: pendingTxCount, error: pendingTxError } = await pendingTxQuery;
    if (pendingTxError) {
        // Ignore filter errors if profile relation doesn't exist or causes issues
        console.warn('Warning fetching pending transactions with source filter:', pendingTxError.message);
        // Fetch without filter as fallback?
         const { count: fallbackPendingCount, error: fallbackPendingError } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
            .gte('created_at', startTime)
            .lte('created_at', endTime);
        if (fallbackPendingError) throw fallbackPendingError;
        funnelStages.push({ stageName: 'Transaction Initiated', count: fallbackPendingCount ?? 0 });
    } else {
        funnelStages.push({ stageName: 'Transaction Initiated', count: pendingTxCount ?? 0 });
    }


    // Stage 3: Transaction Completed
    let completedTxQuery = supabase
      .from('transactions')
      .select('id, unified_profiles(tags)', { count: 'exact' })
      .eq('status', 'completed')
      // Use paid_at or settled_at for completion time?
      // Using created_at for consistency with pending, but paid_at might be better.
      // Let's use paid_at if available, fallback to created_at range.
      .gte('paid_at', startTime) // Prefer paid_at for completion time
      .lte('paid_at', endTime);
      // Add fallback for records where paid_at is null? Complicates query.
      // Stick to paid_at range for completed transactions for now.
      // Filter potentially by transaction_type

    if (sourceFilter === 'organic_tag') {
        completedTxQuery = completedTxQuery.contains('unified_profiles.tags', [targetTag]);
    }
    const { count: completedTxCount, error: completedTxError } = await completedTxQuery;
     if (completedTxError) {
        console.warn('Warning fetching completed transactions with source filter:', completedTxError.message);
        const { count: fallbackCompletedCount, error: fallbackCompletedError } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('paid_at', startTime)
            .lte('paid_at', endTime);
         if (fallbackCompletedError) throw fallbackCompletedError;
         funnelStages.push({ stageName: 'Transaction Completed', count: fallbackCompletedCount ?? 0 });
    } else {
        funnelStages.push({ stageName: 'Transaction Completed', count: completedTxCount ?? 0 });
    }

    // Stage 4: P2P Enrollment
    let enrollmentQuery = supabase
      .from('enrollments')
      .select('id, unified_profiles(tags)', { count: 'exact' })
      .eq('course_id', p2pCourseId)
      .gte('enrolled_at', startTime)
      .lte('enrolled_at', endTime);

    if (sourceFilter === 'organic_tag') {
        enrollmentQuery = enrollmentQuery.contains('unified_profiles.tags', [targetTag]);
    }
    const { count: enrollmentCount, error: enrollmentError } = await enrollmentQuery;
     if (enrollmentError) {
        console.warn('Warning fetching enrollments with source filter:', enrollmentError.message);
         const { count: fallbackEnrollmentCount, error: fallbackEnrollmentError } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', p2pCourseId)
            .gte('enrolled_at', startTime)
            .lte('enrolled_at', endTime);
        if (fallbackEnrollmentError) throw fallbackEnrollmentError;
        funnelStages.push({ stageName: 'P2P Enrollment', count: fallbackEnrollmentCount ?? 0 });
    } else {
        funnelStages.push({ stageName: 'P2P Enrollment', count: enrollmentCount ?? 0 });
    }

    // 4. Prepare response
    const funnelResponse: EnrollmentFunnel = {
      source: sourceFilter,
      stages: funnelStages,
    };

    return NextResponse.json(funnelResponse);

  } catch (error) {
    console.error('Error fetching enrollment funnel:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to fetch enrollment funnel', details: errorMessage }, { status: 500 });
  }
} 