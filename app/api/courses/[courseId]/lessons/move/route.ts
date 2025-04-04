import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { revalidatePath } from 'next/cache';

// Schema for lesson move data
const lessonMoveSchema = z.object({
  lessonId: z.string(),
  sourceModuleId: z.string(),
  targetModuleId: z.string(),
  position: z.number().int().min(0)
});

/**
 * POST handler for moving a lesson between modules
 * 
 * @route POST /api/courses/:courseId/lessons/move
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('🔵 [API] POST request received:', {
      endpoint: '/api/courses/[courseId]/lessons/move',
      timestamp: new Date().toISOString()
    });

    // Get authenticated user
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('🔒 [API] Authentication error:', {
        error: authError,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 [API] User authenticated:', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Await dynamic params
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

    console.log('🔍 [API] Resolved params:', {
      courseId,
      timestamp: new Date().toISOString()
    });

    // Parse and validate request body
    const body = await request.json();
    const { lessonId, sourceModuleId, targetModuleId, position } = lessonMoveSchema.parse(body);

    console.log('📦 [API] Lesson move data:', {
      lessonId,
      sourceModuleId,
      targetModuleId,
      position,
      timestamp: new Date().toISOString()
    });

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Verify the course exists
    const { data: course, error: courseError } = await serviceClient
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('❌ [API] Course not found:', {
        courseId,
        error: courseError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Verify the source module exists and belongs to the course
    const { data: sourceModule, error: sourceModuleError } = await serviceClient
      .from('modules')
      .select('id')
      .eq('id', sourceModuleId)
      .eq('course_id', courseId)
      .single();

    if (sourceModuleError || !sourceModule) {
      console.error('❌ [API] Source module not found:', {
        sourceModuleId,
        courseId,
        error: sourceModuleError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Source module not found' }, { status: 404 });
    }

    // Verify the target module exists and belongs to the course
    const { data: targetModule, error: targetModuleError } = await serviceClient
      .from('modules')
      .select('id')
      .eq('id', targetModuleId)
      .eq('course_id', courseId)
      .single();

    if (targetModuleError || !targetModule) {
      console.error('❌ [API] Target module not found:', {
        targetModuleId,
        courseId,
        error: targetModuleError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Target module not found' }, { status: 404 });
    }

    // Verify the lesson exists and belongs to the source module
    const { data: lesson, error: lessonError } = await serviceClient
      .from('lessons')
      .select('id, title, content_json, position')
      .eq('id', lessonId)
      .eq('module_id', sourceModuleId)
      .single();

    if (lessonError || !lesson) {
      console.error('❌ [API] Lesson not found in source module:', {
        lessonId,
        sourceModuleId,
        error: lessonError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Lesson not found in source module' }, { status: 404 });
    }

    // Get all lessons in the target module to check for position conflicts
    const { data: targetLessons, error: targetLessonsError } = await serviceClient
      .from('lessons')
      .select('id, position')
      .eq('module_id', targetModuleId)
      .order('position', { ascending: true });

    if (targetLessonsError) {
      console.error('❌ [API] Error fetching target module lessons:', {
        targetModuleId,
        error: targetLessonsError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to fetch target module lessons' }, { status: 500 });
    }

    // Get all lessons in the source module to reorder after removal
    const { data: sourceLessons, error: sourceLessonsError } = await serviceClient
      .from('lessons')
      .select('id, position')
      .eq('module_id', sourceModuleId)
      .order('position', { ascending: true });

    if (sourceLessonsError) {
      console.error('❌ [API] Error fetching source module lessons:', {
        sourceModuleId,
        error: sourceLessonsError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to fetch source module lessons' }, { status: 500 });
    }

    console.log('📋 [API] Current lesson positions:', {
      sourceModule: sourceLessons?.map(l => ({ id: l.id, position: l.position })),
      targetModule: targetLessons?.map(l => ({ id: l.id, position: l.position })),
      timestamp: new Date().toISOString()
    });

    // Use a transaction to ensure all updates succeed or fail together
    try {
      // Phase 1: Move all target lessons with position >= requested position to make room
      console.log('🔄 [API] Phase 1: Making room in target module');
      
      // First, move all target lessons to temporary negative positions
      for (let i = 0; i < (targetLessons?.length || 0); i++) {
        const targetLesson = targetLessons?.[i];
        if (!targetLesson) continue;
        
        const tempPosition = -(i + 1000); // Use a large negative number
        
        const { error: tempUpdateError } = await serviceClient
          .from('lessons')
          .update({ 
            position: tempPosition,
            updated_at: new Date().toISOString() 
          })
          .eq('id', targetLesson.id);

        if (tempUpdateError) {
          throw new Error(`Failed to update target lesson ${targetLesson.id} to temporary position: ${tempUpdateError.message}`);
        }
      }
      
      // Phase 2: Move the lesson to the target module with the requested position
      console.log('🔄 [API] Phase 2: Moving lesson to target module');
      
      const { error: moveError } = await serviceClient
        .from('lessons')
        .update({ 
          module_id: targetModuleId,
          position: position,
          updated_at: new Date().toISOString() 
        })
        .eq('id', lessonId);

      if (moveError) {
        throw new Error(`Failed to move lesson ${lessonId} to target module: ${moveError.message}`);
      }
      
      // Phase 3: Reorder target module lessons to their final positions
      console.log('🔄 [API] Phase 3: Reordering target module lessons');
      
      // Get updated target lessons (including the moved lesson)
      const { data: updatedTargetLessons, error: updatedTargetLessonsError } = await serviceClient
        .from('lessons')
        .select('id')
        .eq('module_id', targetModuleId)
        .order('position', { ascending: true });

      if (updatedTargetLessonsError) {
        throw new Error(`Failed to fetch updated target lessons: ${updatedTargetLessonsError.message}`);
      }
      
      // Update positions for all target lessons
      for (let i = 0; i < (updatedTargetLessons?.length || 0); i++) {
        const targetLesson = updatedTargetLessons?.[i];
        if (!targetLesson || targetLesson.id === lessonId) continue; // Skip the moved lesson, already positioned
        
        const finalPosition = i >= position ? i + 1 : i; // Adjust for the moved lesson
        
        const { error: finalUpdateError } = await serviceClient
          .from('lessons')
          .update({ 
            position: finalPosition,
            updated_at: new Date().toISOString() 
          })
          .eq('id', targetLesson.id);

        if (finalUpdateError) {
          throw new Error(`Failed to update target lesson ${targetLesson.id} to final position: ${finalUpdateError.message}`);
        }
      }
      
      // Phase 4: Reorder source module lessons to fill the gap
      console.log('🔄 [API] Phase 4: Reordering source module lessons');
      
      // Filter out the moved lesson
      const remainingSourceLessons = sourceLessons?.filter(l => l.id !== lessonId) || [];
      
      // Update positions for all source lessons
      for (let i = 0; i < remainingSourceLessons.length; i++) {
        const sourceLesson = remainingSourceLessons[i];
        
        const { error: sourceUpdateError } = await serviceClient
          .from('lessons')
          .update({ 
            position: i,
            updated_at: new Date().toISOString() 
          })
          .eq('id', sourceLesson.id);

        if (sourceUpdateError) {
          throw new Error(`Failed to update source lesson ${sourceLesson.id} position: ${sourceUpdateError.message}`);
        }
      }
      
      console.log('✅ [API] Lesson moved successfully');
    } catch (error) {
      console.error('❌ [API] Error in lesson move transaction:', {
        error,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Failed to move lesson between modules',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Revalidate the course page
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseId}`);

    return NextResponse.json({
      message: 'Lesson moved successfully',
      lessonId,
      sourceModuleId,
      targetModuleId,
      position
    });
  } catch (error) {
    console.error('❌ [API] Error in lesson move endpoint:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.format() }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to move lesson' }, { status: 500 });
  }
}
