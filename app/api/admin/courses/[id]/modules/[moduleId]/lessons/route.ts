import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET - Fetch all lessons for a module
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const params = await props.params;
    const courseId = params.id;
    const moduleId = params.moduleId;
  
    // Get supabase client for authentication
    const supabase = await createRouteHandlerClient();
    
    // Verify user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  
    // Get Supabase admin client for bypassing RLS
    const adminClient = await createServiceRoleClient();
  
    // Verify user is an admin using the service role client
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, is_admin")
      .eq("id", user.id)
      .single();
  
    // Allow access if either role is 'admin' OR is_admin is true
    const isAdmin = profile?.role === 'admin' || profile?.is_admin === true;
    
    if (!profile || !isAdmin) {
      return NextResponse.json(
        { 
          error: "Forbidden",
          details: {
            profileExists: !!profile,
            isAdmin,
            message: profileError?.message || "You don't have admin privileges" 
          }
        },
        { status: 403 }
      );
    }

    // Verify course exists
    const { data: course, error: courseError } = await adminClient
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Verify module exists and belongs to the course
    const { data: module, error: moduleError } = await adminClient
      .from("modules")
      .select("id")
      .eq("id", moduleId)
      .eq("course_id", courseId)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Fetch all lessons for the module
    const { data: lessons, error: lessonsError } = await adminClient
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("position", { ascending: true });

    if (lessonsError) {
      console.error("Error fetching lessons:", lessonsError);
      return NextResponse.json(
        { error: "Failed to fetch lessons" },
        { status: 500 }
      );
    }

    return NextResponse.json(lessons);
  } catch (error) {
    console.error("Unexpected error in lesson fetching:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST - Create a new lesson
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const params = await props.params;
    const courseId = params.id;
    const moduleId = params.moduleId;
    
    console.log('POST lesson - Route params:', { courseId, moduleId });

    // Get supabase client for authentication
    const supabase = await createRouteHandlerClient();
    
    // Verify user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    console.log('POST lesson - Auth check:', { 
      isAuthenticated: !!user, 
      userId: user?.id 
    });

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use service role client for all database operations including admin check
    const adminClient = await createServiceRoleClient();
    
    // Verify user is an admin using the service role client
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, is_admin")
      .eq("id", user.id)
      .single();
      
    console.log('POST lesson - Admin check with service client:', { 
      profileExists: !!profile,
      role: profile?.role,
      isAdmin: profile?.is_admin,
      profileError: profileError?.message
    });

    // Allow access if either role is 'admin' OR is_admin is true
    const isAdmin = profile?.role === 'admin' || profile?.is_admin === true;
    
    if (!profile || !isAdmin) {
      return NextResponse.json(
        { 
          error: "Forbidden",
          details: {
            profileExists: !!profile,
            isAdmin,
            message: profileError?.message || "You don't have admin privileges" 
          }
        },
        { status: 403 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { title, description } = body;

    // Validate request
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 }
      );
    }

    // Verify course exists
    const { data: course, error: courseError } = await adminClient
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Verify module exists and belongs to the course
    const { data: module, error: moduleError } = await adminClient
      .from("modules")
      .select("id")
      .eq("id", moduleId)
      .eq("course_id", courseId)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Get the highest position value to add the new lesson at the end
    const { data: positionData, error: positionError } = await adminClient
      .from("lessons")
      .select("position")
      .eq("module_id", moduleId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = positionData && positionData.length > 0 
      ? (positionData[0].position + 1) 
      : 0;

    // Create the lesson
    const { data: lesson, error: insertError } = await adminClient
      .from("lessons")
      .insert({
        title,
        description,
        module_id: moduleId,
        position: nextPosition,
        content: null, // Initialize with empty content
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating lesson:", insertError);
      return NextResponse.json(
        { error: "Failed to create lesson" },
        { status: 500 }
      );
    }

    console.log("Lesson created successfully:", lesson);
    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in lesson creation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 