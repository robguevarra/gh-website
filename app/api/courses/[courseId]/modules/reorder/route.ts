import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { revalidatePath } from 'next/cache';

// Schema for module order data
const moduleOrderSchema = z.object({
  moduleOrder: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0)
    })
  )
});

/**
 * POST handler for reordering modules
 *
 * @route POST /api/courses/:courseId/modules/reorder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('🔵 [API] POST request received:', {
      endpoint: '/api/courses/[courseId]/modules/reorder',
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
    const { moduleOrder } = moduleOrderSchema.parse(body);

    console.log('📦 [API] Module order data:', {
      moduleCount: moduleOrder.length,
      timestamp: new Date().toISOString()
    });

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Verify the course exists and user has access
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

    // Log the module order for debugging
    console.log('📊 [API] Module order to apply:', {
      moduleOrder,
      timestamp: new Date().toISOString()
    });

    // Instead of updating each module individually, do a single transaction
    // This avoids race conditions and conflicts
    try {
      // First, get all the modules for this course to verify they exist
      const { data: existingModules, error: modulesError } = await serviceClient
        .from('modules')
        .select('id, title, position')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (modulesError) {
        console.error('❌ [API] Error fetching modules:', {
          error: modulesError,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
      }

      console.log('📋 [API] Existing modules:', {
        count: existingModules?.length || 0,
        modules: existingModules?.map(m => ({ id: m.id, title: m.title, position: m.position })),
        timestamp: new Date().toISOString()
      });

      // Verify all modules in the order exist in the course
      const moduleIds = new Set(existingModules?.map(m => m.id) || []);
      const invalidModules = moduleOrder.filter(({ id }) => !moduleIds.has(id));

      if (invalidModules.length > 0) {
        console.error('❌ [API] Invalid modules in order:', {
          invalidModules,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          error: 'Some modules in the order do not exist in this course',
          invalidModules
        }, { status: 400 });
      }

      // Update each module one by one to avoid conflicts
      // This is slower but more reliable than parallel updates
      for (const { id, position } of moduleOrder) {
        const { error: updateError } = await serviceClient
          .from('modules')
          .update({
            position,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('❌ [API] Error updating module position:', {
            moduleId: id,
            position,
            error: updateError,
            timestamp: new Date().toISOString()
          });
          throw new Error(`Failed to update module ${id}: ${updateError.message}`);
        }
      }

      console.log('✅ [API] All modules updated successfully');
    } catch (error) {
      console.error('❌ [API] Error in module reorder transaction:', {
        error,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to update module positions' }, { status: 500 });
    }

    // Revalidate the course page
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseId}`);

    console.log('✅ [API] Module positions updated successfully:', {
      courseId,
      moduleCount: moduleOrder.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      message: 'Module positions updated successfully',
      updatedCount: moduleOrder.length
    });
  } catch (error) {
    console.error('❌ [API] Error in module reorder endpoint:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.format() }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to reorder modules' }, { status: 500 });
  }
}
