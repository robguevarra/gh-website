import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

// GET a specific module
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();
    
    // Get profile to check if admin
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || (profile.role !== 'admin' && !profile.is_admin)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Get module
    const { data: module, error: moduleError } = await serviceClient
      .from('modules')
      .select('*, lessons(id)')
      .eq('id', params.moduleId)
      .eq('course_id', params.courseId)
      .single();
    
    if (moduleError) {
      return NextResponse.json(
        { message: 'Module not found', error: moduleError.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH to update a module
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const body = await request.json();
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();
    
    // Get profile to check if admin
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || (profile.role !== 'admin' && !profile.is_admin)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Verify module exists and belongs to the course
    const { data: existingModule, error: moduleError } = await serviceClient
      .from('modules')
      .select('id')
      .eq('id', params.moduleId)
      .eq('course_id', params.courseId)
      .single();
    
    if (moduleError) {
      return NextResponse.json(
        { message: 'Module not found', error: moduleError.message },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (body.title !== undefined && body.title.trim() === '') {
      return NextResponse.json(
        { message: 'Module title cannot be empty' },
        { status: 400 }
      );
    }
    
    // Update module
    const { data: updatedModule, error: updateError } = await serviceClient
      .from('modules')
      .update({
        title: body.title,
        description: body.description,
        // Only update position if explicitly provided
        ...(body.position !== undefined && { position: body.position }),
      })
      .eq('id', params.moduleId)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { message: 'Failed to update module', error: updateError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updatedModule);
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE to remove a module
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();
    
    // Get profile to check if admin
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || (profile.role !== 'admin' && !profile.is_admin)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Verify module exists and belongs to the course
    const { data: existingModule, error: moduleError } = await serviceClient
      .from('modules')
      .select('id')
      .eq('id', params.moduleId)
      .eq('course_id', params.courseId)
      .single();
    
    if (moduleError) {
      return NextResponse.json(
        { message: 'Module not found', error: moduleError.message },
        { status: 404 }
      );
    }
    
    // Delete module (cascade will delete lessons)
    const { error: deleteError } = await serviceClient
      .from('modules')
      .delete()
      .eq('id', params.moduleId);
    
    if (deleteError) {
      return NextResponse.json(
        { message: 'Failed to delete module', error: deleteError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 