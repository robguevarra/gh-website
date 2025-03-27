import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

// GET all courses with relevant information
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'updated_at';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // Create the Supabase clients
    const supabase = await createRouteHandlerClient();
    const serviceClient = createServiceRoleClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Admin courses GET auth check:', { 
      isAuthenticated: !!user, 
      userId: user?.id,
      authError: authError?.message
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    console.log('Admin GET check result:', { 
      profileExists: !!profile,
      role: profile?.role,
      isAdmin: profile?.is_admin,
      profileError: profileError?.message
    });
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Build the query
    let query = serviceClient
      .from('courses')
      .select('*');
    
    // Apply search filter if provided
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      query = query.or(`title.ilike.${searchLower},description.ilike.${searchLower}`);
    }
    
    // Apply status filter if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Get total count for pagination
    const countQuery = serviceClient
      .from('courses')
      .select('*', { count: 'exact', head: true });
      
    // Apply same filters as the main query
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      countQuery.or(`title.ilike.${searchLower},description.ilike.${searchLower}`);
    }
    
    if (status !== 'all') {
      countQuery.eq('status', status);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting courses:', countError);
      return NextResponse.json(
        { error: 'Failed to count courses' },
        { status: 500 }
      );
    }
    
    // Apply ordering and pagination
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    // Execute the query
    const { data: courses, error: coursesError } = await query;
    
    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }
    
    // Calculate pagination values
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return NextResponse.json({
      courses: courses || [],
      totalPages,
      totalCount,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in courses API:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

// POST to create a new course
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Create a Supabase client for auth validation
    const supabase = await createRouteHandlerClient();
    const serviceClient = createServiceRoleClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Admin courses POST auth check:', { 
      isAuthenticated: !!user, 
      userId: user?.id,
      authError: authError?.message
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role - use service client to bypass RLS
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    console.log('Admin POST check result:', { 
      profileExists: !!profile,
      role: profile?.role,
      isAdmin: profile?.is_admin,
      profileError: profileError?.message
    });
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Validate required fields
    if (!body.title || !body.slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }
    
    // Check if slug is already in use
    const { data: existingCourse, error: slugCheckError } = await serviceClient
      .from('courses')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle();
    
    if (existingCourse) {
      return NextResponse.json(
        { error: 'A course with this slug already exists' },
        { status: 409 }
      );
    }
    
    // Set defaults for optional fields
    const courseData = {
      title: body.title,
      slug: body.slug,
      description: body.description || '',
      status: body.status || 'draft',
      is_featured: body.is_featured || false,
      thumbnail_url: body.thumbnail_url || null,
      required_tier_id: body.required_tier_id || null,
      // created_at and updated_at are handled by Supabase
    };
    
    // Create the course
    const { data, error } = await serviceClient
      .from('courses')
      .insert(courseData)
      .select()
      .single();
      
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    console.error('Error in courses POST route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 