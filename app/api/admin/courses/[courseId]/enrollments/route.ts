import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

// GET all enrollments for a course
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Create a Supabase client for auth validation
    const supabase = await createRouteHandlerClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role - use service client to bypass RLS
    const serviceClient = createServiceRoleClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Verify course exists
    const { data: course, error: courseError } = await serviceClient
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
    
    // Fetch enrollments with user profiles
    let query = serviceClient
      .from('user_enrollments')
      .select(`
        id, 
        user_id,
        course_id,
        enrolled_at,
        expires_at,
        status,
        created_at,
        updated_at,
        profiles(id, first_name, last_name, email)
      `)
      .eq('course_id', params.id)
      .order('enrolled_at', { ascending: false });
    
    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply search filter if provided
    if (search && search.trim() !== '') {
      // Search by user's first_name, last_name, or email using ilike
      query = query.or(`profiles.first_name.ilike.%${search}%,profiles.last_name.ilike.%${search}%,profiles.email.ilike.%${search}%`);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute the query
    const { data: enrollments, error: enrollmentsError, count } = await query;
    
    if (enrollmentsError) {
      return NextResponse.json(
        { error: enrollmentsError.message },
        { status: 500 }
      );
    }
    
    // Get total count for pagination with the same filters
    let countQuery = serviceClient
      .from('user_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', params.id);
    
    // Apply the same filters to the count query
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    
    if (search && search.trim() !== '') {
      countQuery = countQuery.or(`profiles.first_name.ilike.%${search}%,profiles.last_name.ilike.%${search}%,profiles.email.ilike.%${search}%`);
    }
    
    const { count: totalCount, error: countError } = await countQuery;
    
    return NextResponse.json({
      enrollments,
      course: {
        id: course.id,
        title: course.title
      },
      pagination: {
        total: totalCount || 0,
        page,
        limit
      }
    });
    
  } catch (error) {
    console.error('Error in course enrollments GET route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST to add a new enrollment to the course
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const { user_id } = body;
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client for auth validation
    const supabase = await createRouteHandlerClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role - use service client to bypass RLS
    const serviceClient = createServiceRoleClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Verify course exists
    const { data: course, error: courseError } = await serviceClient
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
    const { data: targetUser, error: userError } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();
    
    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if enrollment already exists
    const { data: existingEnrollment, error: existingError } = await serviceClient
      .from('user_enrollments')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('course_id', params.id)
      .maybeSingle();
    
    // If enrollment exists and is active, return error
    if (existingEnrollment && existingEnrollment.status === 'active') {
      return NextResponse.json(
        { error: 'User is already enrolled in this course' },
        { status: 409 }
      );
    }
    
    // If enrollment exists but is not active, reactivate it
    if (existingEnrollment) {
      const { data: updated, error: updateError } = await serviceClient
        .from('user_enrollments')
        .update({
          status: 'active',
          enrolled_at: new Date().toISOString(),
          expires_at: body.expires_at || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEnrollment.id)
        .select()
        .single();
      
      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to reactivate enrollment' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: 'Enrollment reactivated successfully',
        enrollment: updated
      });
    }
    
    // Create new enrollment
    const { data: newEnrollment, error: createError } = await serviceClient
      .from('user_enrollments')
      .insert({
        user_id,
        course_id: params.id,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        expires_at: body.expires_at || null
      })
      .select()
      .single();
    
    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create enrollment' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Enrollment created successfully',
      enrollment: newEnrollment
    });
    
  } catch (error) {
    console.error('Error in course enrollments POST route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 