import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

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
    
    // Build the query
    let query = adminClient
      .from('courses')
      .select(`
        *,
        modules:modules(
          *,
          lessons:lessons(*)
        )
      `);
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Apply status filter if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });
    
    // Apply pagination
    query = query
      .range((page - 1) * pageSize, page * pageSize - 1)
      .limit(pageSize);
    
    // Execute query
    const { data: courses, error, count } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({
      courses,
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST to create a new course
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }
    
    // Validate required fields
    if (!body.title || !body.slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }
    
    // Use admin client for database operations
    const adminClient = getAdminClient();
    
    // Check if slug is already in use
    const { data: existingCourse, error: slugCheckError } = await adminClient
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
    
    // Create the course
    const { data: course, error } = await adminClient
      .from('courses')
      .insert({
        title: body.title,
        slug: body.slug,
        description: body.description,
        status: body.status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 