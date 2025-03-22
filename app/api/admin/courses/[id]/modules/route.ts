import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

// GET all modules for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .select('id')
      .eq('id', params.id)
      .single();
    
    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Fetch modules for the course
    const { data: modules, error: modulesError } = await serviceClient
      .from('modules')
      .select('*')
      .eq('course_id', params.id)
      .order('position');
    
    if (modulesError) {
      return NextResponse.json(
        { error: modulesError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(modules);
    
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Create a new module
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description } = body;
    
    // Validate input
    if (!title) {
      return NextResponse.json(
        { error: 'Module title is required' },
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
    
    // Get the max position for the course's modules
    const { data: maxPositionResult, error: positionError } = await serviceClient
      .from('modules')
      .select('position')
      .eq('course_id', params.id)
      .order('position', { ascending: false })
      .limit(1);
    
    // Calculate new position (max + 1 or 0 if none exist)
    const newPosition = maxPositionResult && maxPositionResult.length > 0
      ? (maxPositionResult[0].position || 0) + 1
      : 0;
    
    // Create the new module
    const { data: module, error } = await serviceClient
      .from('modules')
      .insert([
        {
          title,
          description: description || '',
          course_id: params.id,
          position: newPosition
        }
      ])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(module, { status: 201 });
    
  } catch (error) {
    console.error('Error creating module:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 