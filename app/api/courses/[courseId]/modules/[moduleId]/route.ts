import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    const { data: module, error } = await supabase
      .from('modules')
      .select(`
        *,
        lessons(*)
      `)
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (error) {
      console.error('Error fetching module:', error);
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }
    
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    return NextResponse.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
    
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error deleting module:', error);
      return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting module:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 