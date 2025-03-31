import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    // Await dynamic params
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

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
    
    // Check if course exists
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();
    
    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Get modules with lessons
    const { data: modules, error: modulesError, count } = await adminClient
      .from('modules')
      .select(`
        *,
        lessons(*)
      `, { count: 'exact' })
      .eq('course_id', courseId)
      .order('position', { ascending: true });
    
    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      modules,
      count: count || 0
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    // Await dynamic params
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

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
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Module title is required' },
        { status: 400 }
      );
    }
    
    // Check if course exists
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();
    
    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Get current highest position
    const { data: lastModule } = await adminClient
      .from('modules')
      .select('position')
      .eq('course_id', courseId)
      .order('position', { ascending: false })
      .limit(1)
      .single();
    
    const newPosition = lastModule ? lastModule.position + 1 : 1;
    
    // Create the module
    const { data: module, error: createError } = await adminClient
      .from('modules')
      .insert({
        course_id: courseId,
        title: body.title,
        description: body.description || null,
        position: newPosition,
        status: body.status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating module:', createError);
      return NextResponse.json(
        { error: 'Failed to create module' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(module);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 