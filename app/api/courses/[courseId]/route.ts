import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import { z } from 'zod';
import type { CourseStatus } from '@/types/course';

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived'] as const),
  is_published: z.boolean().optional(),
  content_json: z.record(z.unknown()).optional(),
  version: z.number().optional(),
  published_version: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  updated_at: z.string().datetime().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Await params to comply with Next.js 15 dynamic APIs
    const { courseId } = await params
    
    // Create the Supabase clients
    const supabase = await createRouteHandlerClient();
    const serviceClient = createServiceRoleClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
   
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Use service client to bypass RLS
    const { data: course, error } = await serviceClient
      .from('courses')
      .select(`
        *,
        modules:modules(
          *,
          lessons:lessons(*)
        )
      `)
      .eq('id', courseId)
      .single();

    if (error) throw error;
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    // Await params to comply with Next.js 15 dynamic APIs
    const { courseId } = await params;
    
    // Create the Supabase clients
    const supabase = await createRouteHandlerClient();
    const serviceClient = await createServiceRoleClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      console.error('Profile error:', profileError);
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    try {
      const validatedData = courseSchema.parse(body);
      
      // Add updated_at if not provided
      if (!validatedData.updated_at) {
        validatedData.updated_at = new Date().toISOString();
      }
      
      // Use service client to bypass RLS
      const { data: course, error: updateError } = await serviceClient
        .from('courses')
        .update(validatedData)
        .eq('id', courseId)
        .select(`
          *,
          modules:modules(
            *,
            lessons:lessons(*)
          )
        `)
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json(
          { error: { message: updateError.message || 'Failed to update course' } },
          { status: 400 }
        );
      }
      
      if (!course) {
        return NextResponse.json(
          { error: { message: 'Course not found' } },
          { status: 404 }
        );
      }

      return NextResponse.json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: { 
              message: 'Validation failed',
              details: error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
              }))
            } 
          },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: { message: 'Internal Server Error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Await params to comply with Next.js 15 dynamic APIs
    const { courseId } = await params
    
    // Create the Supabase clients
    const supabase = await createRouteHandlerClient();
    const serviceClient = createServiceRoleClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Use service client to bypass RLS
    const { error } = await serviceClient
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 