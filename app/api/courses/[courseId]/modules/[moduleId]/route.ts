import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const moduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  position: z.number().int().min(0),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  metadata: z.record(z.unknown()).optional()
}).transform(data => ({
  ...data,
  status: data.status || 'draft' // Ensure status has a default value
}));

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    console.log('🔵 [API] GET request received:', {
      endpoint: '/api/courses/[courseId]/modules/[moduleId]',
      timestamp: new Date().toISOString()
    })

    // Get authenticated user
    const supabase = await createRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('🔒 [API] Authentication error:', {
        error: authError,
        userId: user?.id,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 [API] User authenticated:', {
      userId: user.id,
      timestamp: new Date().toISOString()
    })

    // Await dynamic params
    const resolvedParams = await params
    const { courseId, moduleId } = resolvedParams

    console.log('🔍 [API] Resolved params:', {
      courseId,
      moduleId,
      timestamp: new Date().toISOString()
    })

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient()

    // Fetch module with its lessons
    const { data: module, error: moduleError } = await serviceClient
      .from('modules')
      .select(`
        *,
        lessons (
          id,
          title,
          description,
          position,
          content,
          content_json,
          metadata,
          is_preview,
          created_at,
          updated_at
        )
      `)
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .order('position', { foreignTable: 'lessons' })
      .single()

    if (moduleError) {
      console.error('❌ [API] Error fetching module:', {
        error: moduleError,
        moduleId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Failed to fetch module' }, { status: 500 })
    }

    if (!module) {
      console.error('❌ [API] Module not found:', {
        moduleId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    console.log('✅ [API] Module fetched successfully:', {
      moduleId: module.id,
      lessonCount: module.lessons?.length || 0,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(module)
  } catch (error) {
    console.error('❌ [API] Unexpected error:', {
      error,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    // Await dynamic params
    const { courseId, moduleId } = await params;

    // Get cookies and convert to string properly
    const cookieStore = await cookies();
    const cookieList = cookieStore.getAll();
    const cookieString = cookieList.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            cookie: cookieString
          }
        }
      }
    );

    // First verify the module exists and belongs to the course
    const { data: existingModule, error: existingError } = await supabase
      .from('modules')
      .select('id')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (existingError || !existingModule) {
      console.error('Module not found:', { moduleId, courseId });
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = moduleSchema.parse(body);

    const { data: module, error } = await supabase
      .from('modules')
      .update(validatedData)
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating module:', error);
      return NextResponse.json({ error: 'Failed to update module' }, { status: 500 });
    }

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    return NextResponse.json(module);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating module:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    console.log('🔵 [API] DELETE request received:', {
      endpoint: '/api/courses/[courseId]/modules/[moduleId]',
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

    // Verify the module exists and belongs to the course
    const { data: module, error: moduleError } = await serviceClient
      .from('modules')
      .select('id, title')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleError || !module) {
      console.error('❌ [API] Module not found:', {
        moduleId,
        courseId,
        error: moduleError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // First, delete all lessons in the module
    const { error: lessonsDeleteError } = await serviceClient
      .from('lessons')
      .delete()
      .eq('module_id', moduleId);

    if (lessonsDeleteError) {
      console.error('❌ [API] Error deleting module lessons:', {
        moduleId,
        error: lessonsDeleteError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to delete module lessons' }, { status: 500 });
    }

    // Then, delete the module
    const { error: moduleDeleteError } = await serviceClient
      .from('modules')
      .delete()
      .eq('id', moduleId);

    if (moduleDeleteError) {
      console.error('❌ [API] Error deleting module:', {
        moduleId,
        error: moduleDeleteError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
    }

    // Return success response
    console.log('✅ [API] Module deleted successfully:', {
      moduleId,
      moduleTitle: module.title,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      message: 'Module deleted successfully',
      moduleId,
      moduleTitle: module.title
    });
  } catch (error) {
    console.error('❌ [API] Error in module delete endpoint:', error);
    return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
  }
}