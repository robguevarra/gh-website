import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

// Log that this route is loaded and ready
console.log('DELETE course route loaded and ready to receive requests');

export async function POST(request: NextRequest) {
  console.log('DELETE course route received a request', {
    method: request.method,
    url: request.url
  });
  
  try {
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
    const { courseId } = body;
    
    console.log('DELETE course request body parsed', { courseId });
    
    if (!courseId) {
      console.log('DELETE course request missing courseId');
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    // Check if course exists
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();
    
    console.log('DELETE course existence check:', {
      courseExists: !!course,
      courseId,
      error: courseError?.message
    });
    
    if (courseError || !course) {
      console.log('DELETE course not found', { courseId });
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Delete course and related data in a transaction
    const { error: deleteError } = await adminClient
      .rpc('delete_course', { course_id: courseId });
    
    if (deleteError) {
      console.error('Error deleting course:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      );
    }
    
    console.log('DELETE course successful', { courseId });
    return NextResponse.json({
      message: 'Course deleted successfully',
      courseId
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 