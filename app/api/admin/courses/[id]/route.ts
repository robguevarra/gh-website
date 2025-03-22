import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

// GET a specific course by ID
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
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
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
    
    // Use service role client to bypass RLS for admin operations
    const serviceClient = createServiceRoleClient();
    
    // Get the course with related tier information
    const { data: course, error } = await serviceClient
      .from('courses')
      .select(`
        id, 
        title, 
        slug, 
        description, 
        status, 
        is_featured, 
        thumbnail_url,
        created_at,
        updated_at,
        required_tier_id,
        membership_tiers(id, name)
      `)
      .eq('id', params.id)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === '22P02' ? 400 : 500 }
      );
    }
    
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(course);
    
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH to update a course
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
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
    
    // Use service role client to bypass RLS for admin operations
    const serviceClient = createServiceRoleClient();
    
    // Check if user has admin role
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
    
    // Check if course exists
    const { data: existingCourse, error: checkError } = await serviceClient
      .from('courses')
      .select('id')
      .eq('id', params.id)
      .maybeSingle();
    
    if (checkError) {
      return NextResponse.json(
        { error: checkError.message },
        { status: 500 }
      );
    }
    
    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Check if slug is being changed and if it's already in use
    if (body.slug) {
      const { data: slugCheck, error: slugCheckError } = await serviceClient
        .from('courses')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', params.id) // Exclude current course
        .maybeSingle();
      
      if (slugCheck) {
        return NextResponse.json(
          { error: 'A course with this slug already exists' },
          { status: 409 }
        );
      }
    }
    
    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    
    // Only add fields that are present in the request body
    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.is_featured !== undefined) updateData.is_featured = body.is_featured;
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url;
    if (body.required_tier_id !== undefined) updateData.required_tier_id = body.required_tier_id;
    
    // If no fields to update, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Update the course
    const { data, error } = await serviceClient
      .from('courses')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE a course
export async function DELETE(
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
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
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
    
    // Use service role client to bypass RLS for admin operations
    const serviceClient = createServiceRoleClient();
    
    // Check if course exists
    const { data: existingCourse, error: checkError } = await serviceClient
      .from('courses')
      .select('id')
      .eq('id', params.id)
      .maybeSingle();
    
    if (checkError) {
      return NextResponse.json(
        { error: checkError.message },
        { status: 500 }
      );
    }
    
    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Check if course has related modules
    const { data: modules, error: modulesError } = await serviceClient
      .from('modules')
      .select('id')
      .eq('course_id', params.id)
      .limit(1);
    
    if (modules && modules.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete course with existing modules. Delete the modules first.' },
        { status: 409 }
      );
    }
    
    // Delete the course
    const { error } = await serviceClient
      .from('courses')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Course deleted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 