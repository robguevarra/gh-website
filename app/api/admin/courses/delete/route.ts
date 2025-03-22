import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

// Log that this route is loaded and ready
console.log('DELETE course route loaded and ready to receive requests');

export async function POST(request: NextRequest) {
  console.log('DELETE course route received a request', {
    method: request.method,
    url: request.url
  });
  
  try {
    const body = await request.json();
    const { courseId } = body;
    
    console.log('DELETE course request body parsed', { courseId });
    
    if (!courseId) {
      console.log('DELETE course request missing courseId');
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client for auth validation
    const supabase = await createRouteHandlerClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Delete course auth check:', { 
      isAuthenticated: !!user, 
      userId: user?.id,
      authError: authError?.message
    });
    
    if (!user) {
      console.log('DELETE course unauthorized');
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
    
    console.log('Delete course admin check:', { 
      profileExists: !!profile,
      role: profile?.role,
      isAdmin: profile?.is_admin,
      profileError: profileError?.message
    });
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      console.log('DELETE course forbidden - not admin');
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Check if course exists
    const { data: existingCourse, error: checkError } = await serviceClient
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .maybeSingle();
    
    console.log('DELETE course existence check:', {
      courseExists: !!existingCourse,
      courseId,
      courseTitle: existingCourse?.title,
      error: checkError?.message
    });
    
    if (checkError) {
      console.log('DELETE course database error', { error: checkError });
      return NextResponse.json(
        { error: checkError.message },
        { status: 500 }
      );
    }
    
    if (!existingCourse) {
      console.log('DELETE course not found', { courseId });
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Check if course has related modules
    const { data: modules, error: modulesError } = await serviceClient
      .from('modules')
      .select('id')
      .eq('course_id', courseId)
      .limit(1);
    
    console.log('DELETE course module check:', {
      hasModules: modules && modules.length > 0,
      moduleCount: modules?.length,
      error: modulesError?.message
    });
    
    if (modules && modules.length > 0) {
      console.log('DELETE course has modules', { 
        courseId,
        moduleCount: modules.length
      });
      return NextResponse.json(
        { error: 'Cannot delete course with existing modules. Delete the modules first.' },
        { status: 409 }
      );
    }
    
    // Delete the course
    const { error } = await serviceClient
      .from('courses')
      .delete()
      .eq('id', courseId);
    
    if (error) {
      console.log('DELETE course error during deletion', { error });
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('DELETE course successful', { courseId });
    return NextResponse.json(
      { message: 'Course deleted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in DELETE course route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 