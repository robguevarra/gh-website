import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId;
    
    // Mock modules data
    const modules = [
      {
        id: "mod-1",
        title: "Getting Started",
        description: "Introduction to the course and setup instructions",
        position: 1,
        status: "published",
        course_id: courseId,
        created_at: "2023-11-15T10:00:00Z",
        updated_at: "2023-11-15T10:00:00Z"
      },
      {
        id: "mod-2",
        title: "Core Concepts",
        description: "Learn about the fundamental concepts",
        position: 2,
        status: "published",
        course_id: courseId,
        created_at: "2023-11-16T10:00:00Z",
        updated_at: "2023-11-16T10:00:00Z"
      },
      {
        id: "mod-3",
        title: "Advanced Topics",
        description: "Dive deeper into advanced areas of the subject",
        position: 3,
        status: "draft",
        course_id: courseId,
        created_at: "2023-11-17T10:00:00Z",
        updated_at: "2023-11-17T10:00:00Z"
      }
    ];
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({
      modules,
      count: modules.length,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
  }
} 