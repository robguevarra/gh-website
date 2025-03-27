import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import { z } from 'zod';

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  settings: z.object({
    access: z.object({
      drip_content: z.boolean(),
      prerequisite_courses: z.array(z.string())
    }),
    display: z.object({
      show_progress: z.boolean(),
      show_completion: z.boolean(),
      show_discussions: z.boolean()
    }),
    enrollment: z.object({
      type: z.enum(['open', 'invite', 'paid']),
      price: z.number().nullable(),
      currency: z.string(),
      trial_days: z.number()
    })
  }).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Create the Supabase clients
    const supabase = await createRouteHandlerClient();
    const serviceClient = createServiceRoleClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Course GET auth check:', { 
      isAuthenticated: !!user, 
      userId: user?.id,
      authError: authError?.message
    });
    
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
    
    console.log('Course GET admin check:', { 
      profileExists: !!profile,
      role: profile?.role,
      isAdmin: profile?.is_admin,
      profileError: profileError?.message
    });
    
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
      .eq('id', params.courseId)
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
  { params }: { params: { courseId: string } }
) {
  try {
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
    
    const body = await request.json();
    const validatedData = courseSchema.parse(body);
    
    // Use service client to bypass RLS
    const { data: course, error } = await serviceClient
      .from('courses')
      .update(validatedData)
      .eq('id', params.courseId)
      .select()
      .single();

    if (error) throw error;
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    return NextResponse.json(course);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
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
      .eq('id', params.courseId);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 