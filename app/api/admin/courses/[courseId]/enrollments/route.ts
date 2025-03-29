import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

// GET all enrollments for a course
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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
      .eq('id', params.id)
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
      .from('user_enrollments')
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
      .eq('course_id', params.id)
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
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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
      .eq('id', params.id)
      .single();
    
    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Verify user exists
    const { data: user, error: userError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if enrollment already exists
    const { data: existingEnrollment, error: checkError } = await adminClient
      .from('user_enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', params.id)
      .maybeSingle();
    
    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'User is already enrolled in this course' },
        { status: 409 }
      );
    }
    
    // Create the enrollment
    const { data: enrollment, error: createError } = await adminClient
      .from('user_enrollments')
      .insert({
        user_id,
        course_id: params.id,
        status: body.status || 'active',
        enrolled_at: new Date().toISOString(),
        expires_at: body.expires_at || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        profiles!user_id(
          id,
          first_name,
          last_name,
          email,
          role,
          status
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