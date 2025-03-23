import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from '@/types/supabase';

import { supabaseAdmin } from "@/lib/supabase/admin";

// POST - Reorder lessons
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  const params = await props.params;
  const { courseId, moduleId } = params;

  // Get supabase client for authentication using the modern SSR package
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  );

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

  // Use the supabaseAdmin client directly from the imported module
  // Verify course exists
  const { data: course, error: courseError } = await supabaseAdmin
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
  const { data: module, error: moduleError } = await supabaseAdmin
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
  const { data: existingLessons, error: lessonsError } = await supabaseAdmin
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
  const existingIds = new Set(existingLessons.map((lesson: { id: string }) => lesson.id));
  const allLessonIdsExist = lessonOrder.every(item => existingIds.has(item.id));

  if (!allLessonIdsExist) {
    return NextResponse.json(
      { error: "One or more lesson ids do not exist in this module" },
      { status: 400 }
    );
  }

  try {
    // Use a transaction to update all lesson positions atomically
    const { error } = await supabaseAdmin.rpc('begin_transaction');
    
    if (error) {
      throw new Error('Failed to begin transaction');
    }
    
    // Update lesson positions
    const updatePromises = lessonOrder.map(item => 
      supabaseAdmin
        .from("lessons")
        .update({ position: item.position })
        .eq("id", item.id)
    );
    
    await Promise.all(updatePromises);
    
    // Commit the transaction
    const { error: commitError } = await supabaseAdmin.rpc('commit_transaction');
    
    if (commitError) {
      await supabaseAdmin.rpc('rollback_transaction');
      throw new Error('Failed to commit transaction');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering lessons:", error);
    
    // Ensure transaction is rolled back
    await supabaseAdmin.rpc('rollback_transaction').catch(() => {});
    
    return NextResponse.json(
      { error: "Failed to reorder lessons" },
      { status: 500 }
    );
  }
} 