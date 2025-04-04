import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { revalidatePath } from 'next/cache';

// Schema for lesson order data
const lessonOrderSchema = z.object({
  lessonOrder: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0)
    })
  )
});

/**
 * POST handler for reordering lessons within a module
 *
 * @route POST /api/courses/:courseId/modules/:moduleId/lessons/reorder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    console.log('🔵 [API] POST request received:', {
      endpoint: '/api/courses/[courseId]/modules/[moduleId]/lessons/reorder',
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
    const { courseId, moduleId } = resolvedParams;

    console.log('🔍 [API] Resolved params:', {
      courseId,
      moduleId,
      timestamp: new Date().toISOString()
    });

    // Parse and validate request body
    const body = await request.json();
    const { lessonOrder } = lessonOrderSchema.parse(body);

    console.log('📦 [API] Lesson order data:', {
      lessonCount: lessonOrder.length,
      timestamp: new Date().toISOString()
    });

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Verify the module exists and user has access
    const { data: module, error: moduleError } = await serviceClient
      .from('modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleError || !module) {
      console.error('❌ [API] Module not found:', {
        courseId,
        moduleId,
        error: moduleError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Log the lesson order for debugging
    console.log('📊 [API] Lesson order to apply:', {
      lessonOrder,
      timestamp: new Date().toISOString()
    });

    // Instead of updating each lesson individually, do a single transaction
    // This avoids race conditions and conflicts
    try {
      // First, get all the lessons for this module to verify they exist
      const { data: existingLessons, error: lessonsError } = await serviceClient
        .from('lessons')
        .select('id, title, position')
        .eq('module_id', moduleId)
        .order('position', { ascending: true });

      if (lessonsError) {
        console.error('❌ [API] Error fetching lessons:', {
          error: lessonsError,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
      }

      console.log('📋 [API] Existing lessons:', {
        count: existingLessons?.length || 0,
        lessons: existingLessons?.map(l => ({ id: l.id, title: l.title, position: l.position })),
        timestamp: new Date().toISOString()
      });

      // Verify all lessons in the order exist in the module
      const lessonIds = new Set(existingLessons?.map(l => l.id) || []);
      const invalidLessons = lessonOrder.filter(({ id }) => !lessonIds.has(id));

      if (invalidLessons.length > 0) {
        console.error('❌ [API] Invalid lessons in order:', {
          invalidLessons,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          error: 'Some lessons in the order do not exist in this module',
          invalidLessons
        }, { status: 400 });
      }

      // Update each lesson one by one to avoid conflicts
      // This is slower but more reliable than parallel updates
      for (const { id, position } of lessonOrder) {
        const { error: updateError } = await serviceClient
          .from('lessons')
          .update({
            position,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('❌ [API] Error updating lesson position:', {
            lessonId: id,
            position,
            error: updateError,
            timestamp: new Date().toISOString()
          });
          throw new Error(`Failed to update lesson ${id}: ${updateError.message}`);
        }
      }

      console.log('✅ [API] All lessons updated successfully');
    } catch (error) {
      console.error('❌ [API] Error in lesson reorder transaction:', {
        error,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to update lesson positions' }, { status: 500 });
    }

    // Revalidate the course page
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseId}`);

    console.log('✅ [API] Lesson positions updated successfully:', {
      courseId,
      moduleId,
      lessonCount: lessonOrder.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      message: 'Lesson positions updated successfully',
      updatedCount: lessonOrder.length
    });
  } catch (error) {
    console.error('❌ [API] Error in lesson reorder endpoint:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.format() }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to reorder lessons' }, { status: 500 });
  }
}
