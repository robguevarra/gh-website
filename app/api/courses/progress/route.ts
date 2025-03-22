import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { lessonId, completion_percentage, is_completed } = body;
    
    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }
    
    // Validate lesson exists and user has access
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        id,
        modules!inner(
          id,
          course_id,
          courses!inner(
            id,
            required_tier_id
          )
        )
      `)
      .eq('id', lessonId)
      .single();
    
    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }
    
    // Get course ID from the lesson's module
    const courseId = lesson.modules.course_id;
    const requiredTierId = lesson.modules.courses.required_tier_id;
    
    // Check if user has access to this course
    let hasAccess = false;
    
    // Check if user has required membership tier
    if (requiredTierId) {
      const { data: userMembership, error: membershipError } = await supabase
        .from('user_memberships')
        .select('id, status, membership_tier_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      // User has access if they have an active membership with the required tier or higher
      if (userMembership && userMembership.membership_tier_id >= requiredTierId) {
        hasAccess = true;
      }
    } else {
      // Course has no tier requirement, so all logged-in users have access
      hasAccess = true;
    }
    
    // Check for specific enrollment in this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('user_enrollments')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (enrollment) {
      hasAccess = true;
    }
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this course' },
        { status: 403 }
      );
    }
    
    // Prepare progress data to update
    const progressData: any = {
      user_id: user.id,
      lesson_id: lessonId,
      updated_at: new Date().toISOString(),
    };
    
    // Add optional fields if provided
    if (completion_percentage !== undefined) {
      progressData.completion_percentage = Math.min(Math.max(0, completion_percentage), 100);
    }
    
    if (is_completed !== undefined) {
      progressData.is_completed = is_completed;
      
      // If marking as completed, set completion to 100% and add completed_at timestamp
      if (is_completed) {
        progressData.completion_percentage = 100;
        progressData.completed_at = new Date().toISOString();
      }
    }
    
    // Update or insert progress record
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .upsert(progressData)
      .select()
      .single();
    
    if (progressError) {
      return NextResponse.json(
        { error: 'Failed to update progress', details: progressError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Progress updated successfully',
      progress
    });
    
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const lessonId = url.searchParams.get('lessonId');
    const courseId = url.searchParams.get('courseId');
    
    // If lesson ID is provided, get progress for specific lesson
    if (lessonId) {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single();
      
      if (error) {
        // If no progress found, return empty progress object
        if (error.code === 'PGRST116') {
          return NextResponse.json({
            progress: {
              user_id: user.id,
              lesson_id: lessonId,
              completion_percentage: 0,
              is_completed: false,
            }
          });
        }
        
        return NextResponse.json(
          { error: 'Failed to fetch progress', details: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        progress: data
      });
    }
    
    // If course ID is provided, get progress for all lessons in that course
    if (courseId) {
      // Get all lesson IDs for the course
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('modules.course_id', courseId);
      
      if (lessonsError || !lessons || lessons.length === 0) {
        return NextResponse.json({
          progress: []
        });
      }
      
      const lessonIds = lessons.map(lesson => lesson.id);
      
      // Get progress for all lessons
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);
      
      if (progressError) {
        return NextResponse.json(
          { error: 'Failed to fetch progress', details: progressError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        progress: progress || []
      });
    }
    
    // If no lesson ID or course ID is provided, return error
    return NextResponse.json(
      { error: 'Lesson ID or Course ID is required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
} 