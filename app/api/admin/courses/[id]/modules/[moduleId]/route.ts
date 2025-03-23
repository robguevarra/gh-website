import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET - Retrieve a single module by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  const { id: courseId, moduleId } = params;

  // Get supabase client for authentication
  const supabase = await createRouteHandlerClient();

  // Verify user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify course exists
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .single();

  if (courseError) {
    return NextResponse.json(
      { error: 'Course not found' },
      { status: 404 }
    );
  }

  // Retrieve the module with its lessons
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select(`
      id,
      title,
      description,
      position,
      status,
      course_id,
      created_at,
      updated_at,
      lessons(
        id,
        title,
        description,
        position,
        status,
        module_id,
        created_at,
        updated_at
      )
    `)
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .single();

  if (moduleError) {
    return NextResponse.json(
      { error: 'Module not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(module);
}

// PATCH - Update a module
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  const { id: courseId, moduleId } = params;

  // Get supabase client for authentication
  const supabase = await createRouteHandlerClient();

  // Verify user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Parse request body
  let moduleData;
  try {
    moduleData = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!moduleData.title) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }

  // Update the module
  const { data: updatedModule, error: updateError } = await supabaseAdmin
    .from('modules')
    .update({
      title: moduleData.title,
      description: moduleData.description,
      status: moduleData.status || 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating module:', updateError);
    return NextResponse.json(
      { error: 'Failed to update module' },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedModule);
}

// DELETE - Delete a module
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  const { id: courseId, moduleId } = params;

  // Get supabase client for authentication
  const supabase = await createRouteHandlerClient();

  // Verify user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Delete the module's lessons first
  const { error: lessonsDeleteError } = await supabaseAdmin
    .from('lessons')
    .delete()
    .eq('module_id', moduleId);

  if (lessonsDeleteError) {
    console.error('Error deleting lessons:', lessonsDeleteError);
    return NextResponse.json(
      { error: 'Failed to delete module lessons' },
      { status: 500 }
    );
  }

  // Delete the module
  const { error: moduleDeleteError } = await supabaseAdmin
    .from('modules')
    .delete()
    .eq('id', moduleId)
    .eq('course_id', courseId);

  if (moduleDeleteError) {
    console.error('Error deleting module:', moduleDeleteError);
    return NextResponse.json(
      { error: 'Failed to delete module' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
} 