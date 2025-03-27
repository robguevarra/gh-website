import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId;
    
    // Mock lessons data for the course
    const lessons = [
      // Module 1 lessons
      {
        id: "les-1",
        title: "Welcome to the Course",
        description: "An introduction to what you'll learn",
        content: "<p>Welcome to this amazing course! We'll cover many exciting topics.</p>",
        position: 1,
        status: "published",
        module_id: "mod-1",
        created_at: "2023-11-15T10:30:00Z",
        updated_at: "2023-11-15T10:30:00Z"
      },
      {
        id: "les-2",
        title: "Setting Up Your Environment",
        description: "How to set up your development environment",
        content: "<p>In this lesson, we'll set up all the tools you need for this course.</p>",
        position: 2,
        status: "published",
        module_id: "mod-1",
        created_at: "2023-11-15T11:00:00Z",
        updated_at: "2023-11-15T11:00:00Z",
        featured_image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cHJvZ3JhbW1pbmd8ZW58MHx8MHx8fDA%3D"
      },
      
      // Module 2 lessons
      {
        id: "les-3",
        title: "Core Concept 1",
        description: "Understanding the first core concept",
        content: "<p>Let's dive into our first core concept.</p>",
        position: 1,
        status: "published",
        module_id: "mod-2",
        created_at: "2023-11-16T10:30:00Z",
        updated_at: "2023-11-16T10:30:00Z"
      },
      {
        id: "les-4",
        title: "Core Concept 2",
        description: "Understanding the second core concept",
        content: "<p>Now we'll explore the second core concept in detail.</p>",
        position: 2,
        status: "published",
        module_id: "mod-2",
        created_at: "2023-11-16T11:00:00Z",
        updated_at: "2023-11-16T11:00:00Z"
      },
      {
        id: "les-5",
        title: "Core Concept 3",
        description: "Understanding the third core concept",
        content: "<p>Our third core concept builds on the previous ones.</p>",
        position: 3,
        status: "draft",
        module_id: "mod-2",
        created_at: "2023-11-16T11:30:00Z",
        updated_at: "2023-11-16T11:30:00Z",
        featured_image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29kaW5nfGVufDB8fDB8fHww"
      },
      
      // Module 3 lessons
      {
        id: "les-6",
        title: "Advanced Topic 1",
        description: "Exploring the first advanced topic",
        content: "<p>Time to tackle our first advanced topic.</p>",
        position: 1,
        status: "draft",
        module_id: "mod-3",
        created_at: "2023-11-17T10:30:00Z",
        updated_at: "2023-11-17T10:30:00Z"
      },
      {
        id: "les-7",
        title: "Advanced Topic 2",
        description: "Exploring the second advanced topic",
        content: "<p>This advanced topic is particularly interesting.</p>",
        position: 2,
        status: "draft",
        module_id: "mod-3",
        created_at: "2023-11-17T11:00:00Z",
        updated_at: "2023-11-17T11:00:00Z",
        featured_image: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGNvZGluZ3xlbnwwfHwwfHx8MA%3D%3D"
      }
    ];
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    return NextResponse.json({
      lessons,
      count: lessons.length,
    });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
} 