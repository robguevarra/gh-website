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
  const startTime = startDate.toISOString();
  const endTime = endDate.toISOString();
  const targetTag = 'squeeze';

  try {
    const funnelStages: FunnelStage[] = [];

    // --- Step 0: Get User IDs with the target tag if filtering is active ---
    let userIdsWithTag: string[] | null = null;
    if (sourceFilter === 'organic_tag') {
      const { data: taggedProfiles, error: taggedProfilesError } = await supabase
        .from('unified_profiles')
        .select('id') // Select the user ID
        .contains('tags', [targetTag])
        // Apply the same date filter as leads for consistency?
        // Or should this be based on when the tag was added? 
        // Sticking to created_at for now as per original lead logic.
        .gte('created_at', startTime)
        .lte('created_at', endTime);

      if (taggedProfilesError) {
        console.error('Error fetching tagged profiles:', taggedProfilesError);
        throw new Error(`Failed to fetch user IDs for tag filter: ${taggedProfilesError.message}`);
      }
      userIdsWithTag = taggedProfiles.map(profile => profile.id);
      // If no users have the tag in the period, we know subsequent stages will be 0 for this filter
      if (userIdsWithTag.length === 0) {
         funnelStages.push({ stageName: 'Potential Leads/Visitors', count: 0 });
         funnelStages.push({ stageName: 'Transaction Initiated', count: 0 });
         funnelStages.push({ stageName: 'Transaction Completed', count: 0 });
         funnelStages.push({ stageName: 'P2P Enrollment', count: 0 });
         const emptyFunnelResponse: EnrollmentFunnel = {
           source: sourceFilter,
           stages: funnelStages,
         };
         return NextResponse.json(emptyFunnelResponse);
      }
    }
    // ---------------------------------------------------------------------

    // Stage 1: Potential Leads/Visitors (using tags)
    let leadQuery = supabase
      .from('unified_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    // Apply tag filter using the fetched IDs if applicable
    if (sourceFilter === 'organic_tag' && userIdsWithTag) {
      leadQuery = leadQuery.in('id', userIdsWithTag);
    } // No else needed, if source is 'all', no tag filter applied here.

    const { count: leadCount, error: leadError } = await leadQuery;
    if (leadError) throw leadError;
    funnelStages.push({ stageName: 'Potential Leads/Visitors', count: leadCount ?? 0 });

    // Stage 2: Transaction Initiated (Pending)
    let pendingTxQuery = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    // Apply user ID filter if filtering by tag
    if (sourceFilter === 'organic_tag' && userIdsWithTag) {
      pendingTxQuery = pendingTxQuery.in('user_id', userIdsWithTag);
    }

    const { count: pendingTxCount, error: pendingTxError } = await pendingTxQuery;
    // REMOVE: Fallback logic for missing relationship warning is no longer needed
    // if (pendingTxError) {
    //     console.warn('Warning fetching pending transactions with source filter:', pendingTxError.message);
    //     const { count: fallbackPendingCount, error: fallbackPendingError } = await supabase ...
    //     if (fallbackPendingError) throw fallbackPendingError;
    //     funnelStages.push({ stageName: 'Transaction Initiated', count: fallbackPendingCount ?? 0 });
    // } else {
    //     funnelStages.push({ stageName: 'Transaction Initiated', count: pendingTxCount ?? 0 });
    // }
    // Handle potential errors directly
    if (pendingTxError) {
        console.error("Error fetching pending transactions:", pendingTxError);
        throw new Error(`Failed to fetch pending transactions: ${pendingTxError.message}`);
    }
    funnelStages.push({ stageName: 'Transaction Initiated', count: pendingTxCount ?? 0 });

    // Stage 3: Transaction Completed
    let completedTxQuery = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('paid_at', startTime) 
      .lte('paid_at', endTime);

    // Apply user ID filter if filtering by tag
    if (sourceFilter === 'organic_tag' && userIdsWithTag) {
      completedTxQuery = completedTxQuery.in('user_id', userIdsWithTag);
    }
    
    const { count: completedTxCount, error: completedTxError } = await completedTxQuery;
    // REMOVE: Fallback logic for missing relationship warning
    // if (completedTxError) {
    //     console.warn('Warning fetching completed transactions with source filter:', completedTxError.message);
    //     const { count: fallbackCompletedCount, error: fallbackCompletedError } = await supabase ...
    //     if (fallbackCompletedError) throw fallbackCompletedError;
    //     funnelStages.push({ stageName: 'Transaction Completed', count: fallbackCompletedCount ?? 0 });
    // } else {
    //     funnelStages.push({ stageName: 'Transaction Completed', count: completedTxCount ?? 0 });
    // }
    // Handle potential errors directly
     if (completedTxError) {
        console.error("Error fetching completed transactions:", completedTxError);
        throw new Error(`Failed to fetch completed transactions: ${completedTxError.message}`);
    }
    funnelStages.push({ stageName: 'Transaction Completed', count: completedTxCount ?? 0 });

    // Stage 4: P2P Enrollment
    // Note: Assuming enrollments also have user_id linking to auth.users
    // Need to verify enrollments schema if this part also showed warnings before.
    let enrollmentQuery = supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', p2pCourseId)
      .gte('enrolled_at', startTime)
      .lte('enrolled_at', endTime);

    // Apply user ID filter if filtering by tag
    if (sourceFilter === 'organic_tag' && userIdsWithTag) {
      // Assuming enrollments table has a user_id column referencing auth.users.id
      enrollmentQuery = enrollmentQuery.in('user_id', userIdsWithTag);
    }

    const { count: enrollmentCount, error: enrollmentError } = await enrollmentQuery;
    // REMOVE: Fallback logic (assuming it might have existed or been needed)
    // if (enrollmentError) {
    //    console.warn('Warning fetching enrollments with source filter:', enrollmentError.message);
    //     const { count: fallbackEnrollmentCount, error: fallbackEnrollmentError } = await supabase ...
    //    if (fallbackEnrollmentError) throw fallbackEnrollmentError;
    //    funnelStages.push({ stageName: 'P2P Enrollment', count: fallbackEnrollmentCount ?? 0 });
    // } else {
    //    funnelStages.push({ stageName: 'P2P Enrollment', count: enrollmentCount ?? 0 });
    // }
    // Handle potential errors directly
     if (enrollmentError) {
        console.error("Error fetching P2P enrollments:", enrollmentError);
        // Add a check: if the error is due to filtering on a non-existent user_id column, handle differently?
        // For now, treat as a general fetch error.
        throw new Error(`Failed to fetch P2P enrollments: ${enrollmentError.message}`);
    }
    funnelStages.push({ stageName: 'P2P Enrollment', count: enrollmentCount ?? 0 });

    // 4. Prepare response
    const funnelResponse: EnrollmentFunnel = {
      source: sourceFilter,
      stages: funnelStages,
    };

    return NextResponse.json(funnelResponse);

  } catch (error) {
    console.error('Error processing enrollment funnel:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    // Ensure status code reflects the error type if possible (e.g., 400 for bad input vs 500)
    return NextResponse.json({ error: 'Failed to process enrollment funnel', details: errorMessage }, { status: 500 });
  }
} 