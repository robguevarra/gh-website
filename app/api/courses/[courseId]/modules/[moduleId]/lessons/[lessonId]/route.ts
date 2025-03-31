import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const lessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content_json: z.record(z.unknown()).optional(),
  position: z.number().int().min(0).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  version: z.number().int().min(1).optional(),
  metadata: z.record(z.unknown()).optional()
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  try {
    // Await dynamic params
    const resolvedParams = await params;
    const { courseId, moduleId, lessonId } = resolvedParams;

    const cookieStore = await cookies();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            cookie: await cookieStore.toString()
          }
        }
      }
    );
    
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .single();

    if (error) throw error;
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  try {
    console.log('🔵 [API] PATCH request received:', {
      endpoint: '/api/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]',
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
    const { courseId, moduleId, lessonId } = resolvedParams;

    console.log('🔍 [API] Resolved params:', {
      courseId,
      moduleId,
      lessonId,
      timestamp: new Date().toISOString()
    });

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Verify the lesson exists and belongs to the module
    const { data: existingLesson, error: checkError } = await serviceClient
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .single();

    if (checkError || !existingLesson) {
      console.error('❌ [API] Lesson verification failed:', {
        error: checkError,
        lessonId,
        moduleId,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    console.log('✅ [API] Lesson verified:', {
      lessonId,
      moduleId,
      timestamp: new Date().toISOString()
    });

    // Parse and validate request body
    const body = await request.json();
    console.log('📦 [API] Request body:', {
      body,
      timestamp: new Date().toISOString()
    });

    const validatedData = lessonSchema.parse(body);
    console.log('✨ [API] Data validated:', {
      validatedData,
      timestamp: new Date().toISOString()
    });

    // Increment version if content is being updated
    if (validatedData.content_json || validatedData.title) {
      validatedData.version = (existingLesson.version || 1) + 1;
      console.log('📝 [API] Version incremented:', {
        oldVersion: existingLesson.version,
        newVersion: validatedData.version,
        timestamp: new Date().toISOString()
      });
    }

    console.log('🚀 [API] Updating lesson:', {
      lessonId,
      moduleId,
      data: validatedData,
      timestamp: new Date().toISOString()
    });

    // Update the lesson using service role client
    const { data: lesson, error: updateError } = await serviceClient
      .from('lessons')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [API] Update failed:', {
        error: updateError,
        lessonId,
        moduleId,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
    }

    if (!lesson) {
      console.error('❌ [API] No lesson returned after update:', {
        lessonId,
        moduleId,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
    }

    console.log('✅ [API] Lesson updated successfully:', {
      lessonId,
      moduleId,
      lesson,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(lesson);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [API] Validation error:', {
        error: error.errors,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('❌ [API] Unexpected error:', {
      error,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  try {
    const cookieStore = await cookies();
    const { courseId, moduleId, lessonId } = params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            cookie: await cookieStore.toString()
          }
        }
      }
    );
    
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)
      .eq('module_id', moduleId);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 