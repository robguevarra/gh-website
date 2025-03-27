import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const lessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  content_json: z.record(z.unknown()).optional(),
  position: z.number().int().min(0),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  version: z.number().int().min(1).optional(),
  metadata: z.record(z.unknown()).optional()
});

export async function GET(
  request: Request,
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            cookie: cookieStore.toString()
          }
        }
      }
    );
    
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', params.lessonId)
      .eq('module_id', params.moduleId)
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
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            cookie: cookieStore.toString()
          }
        }
      }
    );
    
    const body = await request.json();
    const validatedData = lessonSchema.parse(body);
    
    // Increment version if content is being updated
    if (validatedData.content_json) {
      validatedData.version = (validatedData.version || 1) + 1;
    }
    
    const { data: lesson, error } = await supabase
      .from('lessons')
      .update(validatedData)
      .eq('id', params.lessonId)
      .eq('module_id', params.moduleId)
      .select()
      .single();

    if (error) throw error;
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

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
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            cookie: cookieStore.toString()
          }
        }
      }
    );
    
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', params.lessonId)
      .eq('module_id', params.moduleId);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 