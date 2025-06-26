import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

// GET all enrollments for a course
export async function GET(request: NextRequest, props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  try {
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }
    
    // Use admin client for database operations
    const adminClient = getAdminClient();
    
    // Verify course exists
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id, title')
      .eq('id', params.courseId)
      .single();
    
    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Get query parameters for filtering and pagination
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '0');
    const offset = page * limit;
    
    // Build base query
    let query = adminClient
      .from('enrollments')
      .select(`
        *,
        profiles!user_id(
          id,
          first_name,
          last_name,
          email,
          role,
          status
        ),
        auth_users:profiles!user_id(auth.users!user_id(
          email_confirmed_at,
          last_sign_in_at
        ))
      `, { count: 'exact' })
      .eq('course_id', params.courseId)
      .order('enrolled_at', { ascending: false });
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(
        `profiles.first_name.ilike.%${search}%,` +
        `profiles.last_name.ilike.%${search}%,` +
        `profiles.email.ilike.%${search}%`
      );
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute query
    const { data: enrollments, error: enrollmentsError, count } = await query;
    
    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch enrollments' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      enrollments,
      pagination: {
        page,
        pageSize: limit,
        total: count || 0
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to add a new enrollment to the course
export async function POST(request: NextRequest, props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  try {
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }
    
    // Use admin client for database operations
    const adminClient = getAdminClient();
    
    const body = await request.json();
    const { user_id } = body;
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Verify course exists
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id')
      .eq('id', params.courseId)
      .single();
    
    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Verify user exists - check both profiles and unified_profiles tables
    const { data: profileUser } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();
    
    const { data: unifiedUser } = await adminClient
      .from('unified_profiles')
      .select('id')
      .eq('id', user_id)
      .single();
    
    // User must exist in at least one of the profile tables
    if (!profileUser && !unifiedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if enrollment already exists
    const { data: existingEnrollment, error: checkError } = await adminClient
      .from('enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', params.courseId)
      .maybeSingle();
    
    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'User is already enrolled in this course' },
        { status: 409 }
      );
    }
    
    // Create the enrollment
    const { data: enrollment, error: createError } = await adminClient
      .from('enrollments')
      .insert({
        user_id,
        course_id: params.courseId,
        status: body.status || 'active',
        expires_at: body.expires_at || null
      })
      .select(`
        *,
        unified_profiles!user_id(
          id,
          first_name,
          last_name,
          email,
          status,
          is_admin,
          is_student,
          is_affiliate
        )
      `)
      .single();
    
    if (createError) {
      console.error('Error creating enrollment:', createError);
      return NextResponse.json(
        { error: 'Failed to create enrollment' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(enrollment);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 