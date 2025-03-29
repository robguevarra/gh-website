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
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, moduleId, lessonId } = params;

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
      console.error('Lesson check error:', checkError);
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = lessonSchema.parse(body);

    // Increment version if content is being updated
    if (validatedData.content_json) {
      validatedData.version = (existingLesson.version || 1) + 1;
    }

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
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
    }

    if (!lesson) {
      return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating lesson:', error);
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