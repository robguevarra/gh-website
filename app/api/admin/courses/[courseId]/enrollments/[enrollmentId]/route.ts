import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

interface RouteParams {
  id: string;
  enrollmentId: string;
}

// GET a specific enrollment
export async function GET(request: NextRequest, props: { params: Promise<RouteParams> }) {
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
    
    // Fetch enrollment with user profile data
    const { data: enrollment, error: enrollmentError } = await serviceClient
      .from('enrollments')
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
      .eq('id', params.enrollmentId)
      .eq('course_id', params.id)
      .single();
    
    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(enrollment);
    
  } catch (error) {
    console.error('Error in enrollment GET route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH to update an enrollment
export async function PATCH(request: NextRequest, props: { params: Promise<RouteParams> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const { status, expires_at } = body;
    
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
    
    // Check if enrollment exists and belongs to the course
    const { data: existingEnrollment, error: existingError } = await serviceClient
      .from('enrollments')
      .select('id')
      .eq('id', params.enrollmentId)
      .eq('course_id', params.id)
      .single();
    
    if (existingError || !existingEnrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    // Only add fields that are provided
    if (status) {
      updateData.status = status;
      
      // If status is changing to active, set enrolled_at to now if not already set
      if (status === 'active') {
        updateData.enrolled_at = new Date().toISOString();
      }
      
      // If status is changing to suspended or cancelled, add a reason if provided
      if (status === 'suspended' || status === 'cancelled') {
        if (body.reason) {
          updateData.notes = body.reason;
        }
      }
    }
    
    if (expires_at !== undefined) {
      updateData.expires_at = expires_at;
    }
    
    // Update the enrollment
    const { data: updatedEnrollment, error: updateError } = await serviceClient
      .from('enrollments')
      .update(updateData)
      .eq('id', params.enrollmentId)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update enrollment' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Enrollment updated successfully',
      enrollment: updatedEnrollment
    });
    
  } catch (error) {
    console.error('Error in enrollment PATCH route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE to remove an enrollment
export async function DELETE(request: NextRequest, props: { params: Promise<RouteParams> }) {
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
    
    // Check if enrollment exists
    const { data: existingEnrollment, error: existingError } = await serviceClient
      .from('enrollments')
      .select('id, user_id')
      .eq('id', params.enrollmentId)
      .eq('course_id', params.id)
      .single();
    
    if (existingError || !existingEnrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }
    
    // Delete related progress data
    const { error: progressDeleteError } = await serviceClient
      .from('user_progress')
      .delete()
      .eq('user_id', existingEnrollment.user_id)
      .eq('lessons.modules.course_id', params.id);
    
    if (progressDeleteError) {
      console.error('Error deleting progress data:', progressDeleteError);
      // Continue with enrollment deletion even if progress deletion fails
    }
    
    // Delete the enrollment
    const { error: deleteError } = await serviceClient
      .from('enrollments')
      .delete()
      .eq('id', params.enrollmentId);
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete enrollment' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Enrollment deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in enrollment DELETE route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 