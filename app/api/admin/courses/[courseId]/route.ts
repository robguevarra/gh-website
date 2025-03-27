import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

// GET a specific course by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId;
    
    // Check if course exists in our mock data
    const course = {
      id: courseId,
      title: "Complete Web Development Bootcamp",
      description: "A comprehensive guide to modern web development",
      content: "<p>This course will take you from beginner to advanced in web development.</p>",
      status: "published",
      price: 99.99,
      slug: "complete-web-development-bootcamp",
      featured_image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8Y29kaW5nfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=800&q=60",
      created_at: "2023-11-10T09:00:00Z",
      updated_at: "2023-11-14T15:00:00Z",
      modules_count: 3,
      lessons_count: 7
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return NextResponse.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
}

// PATCH to update a course
export async function PATCH(request: NextRequest, props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    
    // Create a Supabase client for auth validation
    const supabase = await createRouteHandlerClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Use service role client to bypass RLS for admin operations
    const serviceClient = createServiceRoleClient();
    
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
    
    // Check if course exists
    const { data: existingCourse, error: checkError } = await serviceClient
      .from('courses')
      .select('id')
      .eq('id', params.courseId)
      .maybeSingle();
    
    if (checkError) {
      return NextResponse.json(
        { error: checkError.message },
        { status: 500 }
      );
    }
    
    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Check if slug is being changed and if it's already in use
    if (body.slug) {
      const { data: slugCheck, error: slugCheckError } = await serviceClient
        .from('courses')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', params.courseId) // Exclude current course
        .maybeSingle();
      
      if (slugCheck) {
        return NextResponse.json(
          { error: 'A course with this slug already exists' },
          { status: 409 }
        );
      }
    }
    
    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    
    // Only add fields that are present in the request body
    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.is_featured !== undefined) updateData.is_featured = body.is_featured;
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url;
    if (body.required_tier_id !== undefined) updateData.required_tier_id = body.required_tier_id;
    
    // If no fields to update, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Update the course
    const { data, error } = await serviceClient
      .from('courses')
      .update(updateData)
      .eq('id', params.courseId)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE a course
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: `Course with ID ${courseId} has been deleted successfully.` 
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
} 