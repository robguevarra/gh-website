import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const moduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  position: z.number().int().min(0),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  metadata: z.record(z.unknown()).optional()
});

export async function GET(
  request: Request,
  { params }: { params: { courseId: string; moduleId: string } }
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
    
    const { data: module, error } = await supabase
      .from('modules')
      .select(`
        *,
        lessons(*)
      `)
      .eq('id', params.moduleId)
      .eq('course_id', params.courseId)
      .single();

    if (error) throw error;
    if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    return NextResponse.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { courseId: string; moduleId: string } }
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
    const validatedData = moduleSchema.parse(body);
    
    const { data: module, error } = await supabase
      .from('modules')
      .update(validatedData)
      .eq('id', params.moduleId)
      .eq('course_id', params.courseId)
      .select()
      .single();

    if (error) throw error;
    if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

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
  request: Request,
  { params }: { params: { courseId: string; moduleId: string } }
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
      .from('modules')
      .delete()
      .eq('id', params.moduleId)
      .eq('course_id', params.courseId);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting module:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 