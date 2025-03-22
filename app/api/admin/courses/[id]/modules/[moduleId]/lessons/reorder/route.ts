import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";

// POST - Reorder lessons
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  const { courseId, moduleId } = params;

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

  const { lessonOrder } = body;

  // Validate request
  if (!lessonOrder || !Array.isArray(lessonOrder)) {
    return NextResponse.json(
      { error: "lessonOrder must be an array" },
      { status: 400 }
    );
  }

  if (lessonOrder.some(item => !item.id || typeof item.position !== 'number')) {
    return NextResponse.json(
      { error: "Each item in lessonOrder must have an id and position" },
      { status: 400 }
    );
  }

  // Get Supabase admin client for bypassing RLS
  const adminClient = createAdminClient();

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

  // Fetch all lessons for this module to validate the ids in lessonOrder
  const { data: existingLessons, error: lessonsError } = await adminClient
    .from("lessons")
    .select("id")
    .eq("module_id", moduleId);

  if (lessonsError) {
    console.error("Error fetching lessons:", lessonsError);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }

  // Verify all lesson ids in the order array belong to this module
  const existingIds = new Set(existingLessons.map(lesson => lesson.id));
  const allLessonIdsExist = lessonOrder.every(item => existingIds.has(item.id));

  if (!allLessonIdsExist) {
    return NextResponse.json(
      { error: "One or more lesson ids do not exist in this module" },
      { status: 400 }
    );
  }

  try {
    // Use a transaction to update all lesson positions atomically
    const { error } = await adminClient.rpc('begin_transaction');
    
    if (error) {
      throw new Error('Failed to begin transaction');
    }
    
    // Update lesson positions
    const updatePromises = lessonOrder.map(item => 
      adminClient
        .from("lessons")
        .update({ position: item.position })
        .eq("id", item.id)
    );
    
    await Promise.all(updatePromises);
    
    // Commit the transaction
    const { error: commitError } = await adminClient.rpc('commit_transaction');
    
    if (commitError) {
      await adminClient.rpc('rollback_transaction');
      throw new Error('Failed to commit transaction');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering lessons:", error);
    
    // Ensure transaction is rolled back
    await adminClient.rpc('rollback_transaction').catch(() => {});
    
    return NextResponse.json(
      { error: "Failed to reorder lessons" },
      { status: 500 }
    );
  }
} 