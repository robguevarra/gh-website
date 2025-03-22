import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

// GET all courses with relevant information
export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client for auth validation
    const supabase = await createRouteHandlerClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Admin courses API auth check:', { 
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    console.log('Admin check result:', { 
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
    
    // Use service role client to bypass RLS for admin operations
    const serviceClient = createServiceRoleClient();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');
    
    // Initialize query
    let query = serviceClient
      .from('courses')
      .select(`
        id, 
        title, 
        slug, 
        description, 
        status, 
        is_featured, 
        thumbnail_url,
        created_at,
        updated_at,
        required_tier_id,
        membership_tiers(name)
      `)
      .order('updated_at', { ascending: false });
    
    // Apply filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    if (tier) {
      query = query.eq('required_tier_id', tier);
    }
    
    const { data: courses, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(courses);
    
  } catch (error) {
    console.error('Error in courses GET route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST to create a new course
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Create a Supabase client for auth validation
    const supabase = await createRouteHandlerClient();
    const serviceClient = createServiceRoleClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Admin courses POST auth check:', { 
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
    
    // Check if user has admin role - use service client to bypass RLS
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    console.log('Admin POST check result:', { 
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
    
    // Validate required fields
    if (!body.title || !body.slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }
    
    // Check if slug is already in use
    const { data: existingCourse, error: slugCheckError } = await serviceClient
      .from('courses')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle();
    
    if (existingCourse) {
      return NextResponse.json(
        { error: 'A course with this slug already exists' },
        { status: 409 }
      );
    }
    
    // Set defaults for optional fields
    const courseData = {
      title: body.title,
      slug: body.slug,
      description: body.description || '',
      status: body.status || 'draft',
      is_featured: body.is_featured || false,
      thumbnail_url: body.thumbnail_url || null,
      required_tier_id: body.required_tier_id || null,
      // created_at and updated_at are handled by Supabase
    };
    
    // Create the course
    const { data, error } = await serviceClient
      .from('courses')
      .insert(courseData)
      .select()
      .single();
      
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    console.error('Error in courses POST route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 