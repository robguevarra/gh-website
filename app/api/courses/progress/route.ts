import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient();
  const adminClient = getAdminClient();

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
    const { error: beginError } = await adminClient.rpc('begin_transaction');
    if (beginError) throw beginError;

    try {
      // Check if course progress exists
      const { data: existingProgress, error: progressError } = await adminClient
        .from('course_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      // If no course progress, create one
      if (progressError) {
        await adminClient.from('course_progress').insert({
          user_id: user.id,
          course_id: courseId,
          status: 'in_progress',
          progress_percentage: 0,
          last_accessed_at: new Date().toISOString(),
        });
      } else {
        // Update last accessed time
        await adminClient
          .from('course_progress')
          .update({
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existingProgress.id);
      }

      // Check if lesson progress exists
      const { data: existingLessonProgress, error: lessonProgressError } = await adminClient
        .from('lesson_progress')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single();

      const lessonStatus = status || 'in_progress';
      const completedAt = lessonStatus === 'completed' ? new Date().toISOString() : null;

      if (lessonProgressError) {
        // Create new lesson progress
        await adminClient.from('lesson_progress').insert({
          user_id: user.id,
          lesson_id: lessonId,
          status: lessonStatus,
          completed_at: completedAt,
        });
      } else if (existingLessonProgress.status !== 'completed' || lessonStatus === 'completed') {
        // Update lesson progress if not already completed or if marking as completed
        await adminClient
          .from('lesson_progress')
          .update({
            status: lessonStatus,
            completed_at: completedAt,
          })
          .eq('id', existingLessonProgress.id);
      }

      // Update overall course progress percentage
      await adminClient.rpc('update_course_progress', {
        p_user_id: user.id,
        p_course_id: courseId,
      });

      // Commit the transaction
      const { error: commitError } = await adminClient.rpc('commit_transaction');
      if (commitError) throw commitError;

      return NextResponse.json({ success: true });
    } catch (error) {
      // Rollback on error
      try {
        await adminClient.rpc('rollback_transaction');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
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
        description,
        thumbnail_url,
        modules (
          id,
          title,
          position,
          lessons (
            id,
            title,
            position,
            lesson_progress (
              status,
              completed_at
            )
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('last_accessed_at', { ascending: false });

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  try {
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
} 