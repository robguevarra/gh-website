import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';
import { startOfMonth, endOfMonth, formatISO } from 'date-fns';

// Define the structure for the details response
interface EnrollmentDetail {
  enrollmentId: string;
  userId: string;
  userEmail: string | null;
  userName: string | null; // Combined first/last name
  enrolledAt: string;
  status: string;
  sourceTags: string[] | null;
  // Add other relevant fields as needed, e.g., transaction_id
}

interface EnrollmentDetailsResponse {
  enrollments: EnrollmentDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
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

  // 2. Get Parameters (Date Range, Search, Pagination)
  const currentDate = new Date();
  const defaultStartDate = formatISO(startOfMonth(currentDate));
  const defaultEndDate = formatISO(endOfMonth(currentDate));

  const startDateParam = searchParams.get('startDate') || defaultStartDate;
  const endDateParam = searchParams.get('endDate') || defaultEndDate;
  const searchQuery = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  // Validate date parameters
  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }
  endDate.setHours(23, 59, 59, 999);

  // Validate pagination parameters
  if (page < 1 || pageSize < 1) {
    return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
  }
  const rangeStart = (page - 1) * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;

  // Use hardcoded P2P Course ID
  const p2pCourseId = '7e386720-8839-4252-bd5f-09a33c3e1afb';

  try {
    // 3. Build the query
    let query = supabase
      .from('enrollments')
      .select(`
        id,
        user_id,
        enrolled_at,
        status,
        unified_profiles (
          email,
          first_name,
          last_name,
          tags
        )
      `, { count: 'exact' })
      .eq('course_id', p2pCourseId)
      .gte('enrolled_at', startDate.toISOString())
      .lte('enrolled_at', endDate.toISOString())
      .order('enrolled_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    // Add search filter if query exists
    if (searchQuery) {
      // Search across email, first name, last name
      // Note: This requires the unified_profiles table to be joined.
      // The filter below attempts this using or condition on related table.
      // This might be inefficient; consider a dedicated search function/index if needed.
      query = query.or(`unified_profiles.email.ilike.%${searchQuery}%,unified_profiles.first_name.ilike.%${searchQuery}%,unified_profiles.last_name.ilike.%${searchQuery}%`);
    }

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      // Check if the error is due to the complex OR filter on the related table
      if (error.message.includes('missing FROM-clause entry for table "unified_profiles"')) {
        console.warn('Search filter failed due to join complexity. Returning results without search filter.');
        // Retry query without the search filter
        let fallbackQuery = supabase
          .from('enrollments')
          .select(`id, user_id, enrolled_at, status, unified_profiles ( email, first_name, last_name, tags )`, { count: 'exact' })
          .eq('course_id', p2pCourseId)
          .gte('enrolled_at', startDate.toISOString())
          .lte('enrolled_at', endDate.toISOString())
          .order('enrolled_at', { ascending: false })
          .range(rangeStart, rangeEnd);
        
        const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery;
        if (fallbackError) throw fallbackError; // Throw if fallback also fails
        return processResponse(fallbackData, fallbackCount, page, pageSize);

      } else {
         throw error; // Throw other errors
      }
    }
    
    return processResponse(data, count, page, pageSize);

  } catch (error) {
    console.error('Error fetching enrollment details:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to fetch enrollment details', details: errorMessage }, { status: 500 });
  }
}

// Helper function to format the response
function processResponse(data: any[] | null, count: number | null, page: number, pageSize: number): NextResponse {
  const safeData = data ?? [];
  const totalCount = count ?? 0;

  const formattedEnrollments: EnrollmentDetail[] = safeData.map((item: any) => {
      const profile = item.unified_profiles as {
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        tags: string[] | null;
      } | null;
      
      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;

      return {
        enrollmentId: item.id,
        userId: item.user_id,
        userEmail: profile?.email ?? null,
        userName: userName,
        enrolledAt: item.enrolled_at,
        status: item.status,
        sourceTags: profile?.tags ?? null,
      };
    });

  const response: EnrollmentDetailsResponse = {
    enrollments: formattedEnrollments,
    totalCount: totalCount,
    page: page,
    pageSize: pageSize,
  };

  return NextResponse.json(response);
} 