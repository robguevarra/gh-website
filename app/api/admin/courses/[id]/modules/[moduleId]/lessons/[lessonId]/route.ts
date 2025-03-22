import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";

// GET - Fetch a specific lesson
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  const { courseId, moduleId, lessonId } = params;

  // Get supabase client for authentication
  const supabase = createRouteHandlerClient({ cookies });
  
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

  // Verify user is an admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Get Supabase admin client for bypassing RLS
  const adminClient = createAdminClient();

  // Fetch the lesson
  const { data: lesson, error: lessonError } = await adminClient
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("module_id", moduleId)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json(
      { error: "Lesson not found" },
      { status: 404 }
    );
  }

  // Verify module belongs to the course
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

  return NextResponse.json(lesson);
}

// PATCH - Update a lesson
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  const { courseId, moduleId, lessonId } = params;

  // Get supabase client for authentication
  const supabase = createRouteHandlerClient({ cookies });
  
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

  // Verify user is an admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { title, description, status, content } = body;

  // Validate request
  if (title !== undefined && (!title || typeof title !== "string")) {
    return NextResponse.json(
      { error: "Title must be a non-empty string" },
      { status: 400 }
    );
  }

  // Get Supabase admin client for bypassing RLS
  const adminClient = createAdminClient();

  // Verify module belongs to the course
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

  // Verify lesson exists and belongs to the module
  const { data: existingLesson, error: lessonError } = await adminClient
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("module_id", moduleId)
    .single();

  if (lessonError || !existingLesson) {
    return NextResponse.json(
      { error: "Lesson not found" },
      { status: 404 }
    );
  }

  // Build the update object with only the fields that are provided
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (content !== undefined) updateData.content = content;
  updateData.updated_at = new Date().toISOString();

  // Update the lesson
  const { data: updatedLesson, error: updateError } = await adminClient
    .from("lessons")
    .update(updateData)
    .eq("id", lessonId)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating lesson:", updateError);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedLesson);
}

// DELETE - Delete a lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  const { courseId, moduleId, lessonId } = params;

  // Get supabase client for authentication
  const supabase = createRouteHandlerClient({ cookies });
  
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

  // Verify user is an admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Get Supabase admin client for bypassing RLS
  const adminClient = createAdminClient();

  // Verify module belongs to the course
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

  // Verify lesson exists and belongs to the module
  const { data: lesson, error: lessonError } = await adminClient
    .from("lessons")
    .select("id, position")
    .eq("id", lessonId)
    .eq("module_id", moduleId)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json(
      { error: "Lesson not found" },
      { status: 404 }
    );
  }

  // Delete the lesson
  const { error: deleteError } = await adminClient
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (deleteError) {
    console.error("Error deleting lesson:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }

  // Reorder remaining lessons to ensure there are no gaps in positions
  const { data: remainingLessons, error: fetchError } = await adminClient
    .from("lessons")
    .select("id, position")
    .eq("module_id", moduleId)
    .order("position", { ascending: true });

  if (!fetchError && remainingLessons) {
    // Update positions to be sequential
    const updatePromises = remainingLessons.map(async (lesson, index) => {
      return adminClient
        .from("lessons")
        .update({ position: index })
        .eq("id", lesson.id);
    });

    await Promise.all(updatePromises);
  }

  return NextResponse.json({ success: true });
} 