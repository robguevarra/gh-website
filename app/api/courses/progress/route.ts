import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
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

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { courseId, lessonId, status } = body;

  // Validate required fields
  if (!courseId || !lessonId) {
    return NextResponse.json(
      { error: 'courseId and lessonId are required' },
      { status: 400 }
    );
  }

  // Validate status if provided
  if (status && !['not_started', 'in_progress', 'completed'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status value' },
      { status: 400 }
    );
  }

  try {
    // Check if user has access to the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this course' },
        { status: 403 }
      );
    }

    // Verify the lesson belongs to the course
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, module_id, modules!inner(course_id)')
      .eq('id', lessonId)
      .eq('modules.course_id', courseId)
      .single();

    if (lessonError || !lessonData) {
      return NextResponse.json(
        { error: 'Lesson not found in this course' },
        { status: 404 }
      );
    }

    // Start a transaction
    const { error: beginError } = await supabaseAdmin.rpc('begin_transaction');
    if (beginError) throw beginError;

    try {
      // Check if course progress exists
      const { data: existingProgress, error: progressError } = await supabaseAdmin
        .from('course_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      // If no course progress, create one
      if (progressError) {
        await supabaseAdmin.from('course_progress').insert({
          user_id: user.id,
          course_id: courseId,
          status: 'in_progress',
          progress_percentage: 0,
          last_accessed_at: new Date().toISOString(),
        });
      } else {
        // Update last accessed time
        await supabaseAdmin
          .from('course_progress')
          .update({
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existingProgress.id);
      }

      // Check if lesson progress exists
      const { data: existingLessonProgress, error: lessonProgressError } = await supabaseAdmin
        .from('lesson_progress')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single();

      const lessonStatus = status || 'in_progress';
      const completedAt = lessonStatus === 'completed' ? new Date().toISOString() : null;

      if (lessonProgressError) {
        // Create new lesson progress
        await supabaseAdmin.from('lesson_progress').insert({
          user_id: user.id,
          lesson_id: lessonId,
          status: lessonStatus,
          completed_at: completedAt,
        });
      } else if (existingLessonProgress.status !== 'completed' || lessonStatus === 'completed') {
        // Update lesson progress if not already completed or if marking as completed
        await supabaseAdmin
          .from('lesson_progress')
          .update({
            status: lessonStatus,
            completed_at: completedAt,
          })
          .eq('id', existingLessonProgress.id);
      }

      // Update overall course progress percentage
      await supabaseAdmin.rpc('update_course_progress', {
        p_user_id: user.id,
        p_course_id: courseId,
      });

      // Commit the transaction
      const { error: commitError } = await supabaseAdmin.rpc('commit_transaction');
      if (commitError) throw commitError;

      return NextResponse.json({ success: true });
    } catch (error) {
      // Rollback on error
      await supabaseAdmin.rpc('rollback_transaction').catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

  // Check if we're getting progress for a specific course
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');

  let query = supabase
    .from('course_progress')
    .select(`
      id,
      user_id,
      course_id,
      status,
      progress_percentage,
      created_at,
      updated_at,
      last_accessed_at,
      courses (
        id,
        title,
        slug,
        thumbnail_url,
        published
      ),
      lesson_progress (
        id,
        lesson_id,
        status,
        completed_at,
        lessons (
          id,
          title,
          module_id,
          modules (
            id,
            title,
            course_id
          )
        )
      )
    `)
    .eq('user_id', user.id);

  // Add courseId filter if provided
  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching course progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course progress' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
} 