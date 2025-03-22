import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

// POST - Create a new lesson
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  console.log("Creating lesson - params:", params);
  
  const { id: courseId, moduleId } = await params;
  
  // 1. Authenticate the user
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log("Unauthorized: No user found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  console.log("User authenticated:", user.id);
  
  // 2. Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();
  
  console.log("User profile:", profile);
  
  if (!profile || (profile.role !== "admin" && !profile.is_admin)) {
    console.log("Forbidden: User is not admin");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  console.log("Admin status verified");
  
  // 3. Get the request body
  const body = await request.json();
  const { title, description, status = "draft" } = body;
  
  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }
  
  // 4. Use service role client for DB operations (from server.ts)
  const adminClient = await createServiceRoleClient();
  
  // 5. Verify course exists
  const { data: course, error: courseError } = await adminClient
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .single();
  
  if (courseError || !course) {
    console.log("Course not found:", courseId);
    return NextResponse.json(
      { error: "Course not found" },
      { status: 404 }
    );
  }
  
  // 6. Verify module exists and belongs to course
  const { data: module, error: moduleError } = await adminClient
    .from("modules")
    .select("id")
    .eq("id", moduleId)
    .eq("course_id", courseId)
    .single();
  
  if (moduleError || !module) {
    console.log("Module not found:", moduleId);
    return NextResponse.json(
      { error: "Module not found" },
      { status: 404 }
    );
  }
  
  // 7. Get highest position for ordering
  const { data: positionData } = await adminClient
    .from("lessons")
    .select("position")
    .eq("module_id", moduleId)
    .order("position", { ascending: false })
    .limit(1);
  
  const nextPosition = positionData && positionData.length > 0 
    ? (positionData[0].position + 1) 
    : 0;
  
  // 8. Create the lesson
  const { data: lesson, error: insertError } = await adminClient
    .from("lessons")
    .insert({
      title,
      description,
      status,
      module_id: moduleId,
      position: nextPosition,
      content: null,
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
}

// GET - Fetch all lessons for a module
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const { id: courseId, moduleId } = await params;
  
  // 1. Authenticate the user
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // 2. Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();
  
  if (!profile || (profile.role !== "admin" && !profile.is_admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // 3. Use service role client for DB operations (from server.ts)
  const adminClient = await createServiceRoleClient();
  
  // 4. Check if course exists
  const { data: course, error: courseError } = await adminClient
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .single();
  
  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  
  // 5. Check if module exists and belongs to course
  const { data: module, error: moduleError } = await adminClient
    .from("modules")
    .select("id")
    .eq("id", moduleId)
    .eq("course_id", courseId)
    .single();
  
  if (moduleError || !module) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }
  
  // 6. Fetch all lessons for the module
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
} 