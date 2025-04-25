import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';
import { startOfMonth, endOfMonth, formatISO } from 'date-fns';

// Define the structure for segmentation response
interface SegmentationGroup {
  segmentName: string; // e.g., 'Source: Squeeze Tag', 'Source: Other', 'Profile Tag: X'
  count: number;
}

interface EnrollmentSegmentation {
  dateRange: { startDate: string; endDate: string };
  segmentationType: string; // e.g., 'bySourceTag', 'byProfileTag'
  groups: SegmentationGroup[];
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

  // 2. Get Parameters (Date Range, Segmentation Type - Default to bySourceTag)
  const currentDate = new Date();
  const defaultStartDate = formatISO(startOfMonth(currentDate));
  const defaultEndDate = formatISO(endOfMonth(currentDate));

  const startDateParam = searchParams.get('startDate') || defaultStartDate;
  const endDateParam = searchParams.get('endDate') || defaultEndDate;
  const segmentationType = searchParams.get('type') || 'bySourceTag'; // Add more types later

  // Validate date parameters
  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }
  endDate.setHours(23, 59, 59, 999);

  // Use hardcoded P2P Course ID
  const p2pCourseId = '7e386720-8839-4252-bd5f-09a33c3e1afb';

  try {
    let segmentationResult: EnrollmentSegmentation | null = null;

    // 3. Fetch and segment data based on type
    if (segmentationType === 'bySourceTag') {
      const targetTag = 'squeeze'; // Tag indicating P2P source

      // Fetch enrollments with profile tags within the date range
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          unified_profiles ( tags )
        `)
        .eq('course_id', p2pCourseId)
        .gte('enrolled_at', startDate.toISOString())
        .lte('enrolled_at', endDate.toISOString());

      if (error) throw error;

      // Process segmentation
      let countWithTag = 0;
      let countWithoutTag = 0;

      data?.forEach(enrollment => {
        // Type guard for profile and tags
        const profile = enrollment.unified_profiles as {
          tags: string[] | null;
        } | null;
        
        if (profile?.tags?.includes(targetTag)) {
          countWithTag++;
        } else {
          countWithoutTag++;
        }
      });

      segmentationResult = {
        dateRange: { startDate: startDateParam, endDate: endDateParam },
        segmentationType: 'bySourceTag',
        groups: [
          { segmentName: `Source: ${targetTag} Tag`, count: countWithTag },
          { segmentName: 'Source: Other/Unknown', count: countWithoutTag },
        ],
      };
    } else {
      // Placeholder for other segmentation types (e.g., by other profile tags)
      return NextResponse.json({ error: 'Unsupported segmentation type' }, { status: 400 });
    }

    return NextResponse.json(segmentationResult);

  } catch (error) {
    console.error('Error fetching enrollment segmentation:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to fetch enrollment segmentation', details: errorMessage }, { status: 500 });
  }
} 