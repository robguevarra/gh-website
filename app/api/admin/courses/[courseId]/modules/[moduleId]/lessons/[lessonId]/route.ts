import { NextRequest, NextResponse } from "next/server";

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  position: number;
  status: 'draft' | 'published' | 'archived';
  module_id: string;
  created_at: string;
  updated_at: string;
}

// Mock lessons data for testing
const mockLessons: Lesson[] = [
  {
    id: "lesson1",
    title: "Introduction to the Course",
    description: "Overview of what you'll learn in this course",
    content: "<p>Welcome to the course! In this lesson, we'll cover...</p>",
    position: 0,
    status: "published",
    module_id: "module1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lesson2",
    title: "Getting Started with the Basics",
    description: "Learn the fundamental concepts",
    content: "<p>In this lesson, we'll explore the basic concepts of...</p>",
    position: 1,
    status: "published",
    module_id: "module1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lesson3",
    title: "Advanced Techniques",
    description: "Take your skills to the next level",
    content: "<p>Now that you understand the basics, let's dive deeper into...</p>",
    position: 2,
    status: "draft",
    module_id: "module1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const lessonId = params.lessonId;
    const lesson = mockLessons.find(lesson => lesson.id === lessonId);
    
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(lesson);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  try {
    const lessonId = params.lessonId;
    const body = await request.json();
    
    // Find the lesson to update
    const lessonIndex = mockLessons.findIndex(lesson => lesson.id === lessonId);
    
    if (lessonIndex === -1) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would update the lesson in the database
    // For now, let's create an updated version
    const updatedLesson: Lesson = {
      ...mockLessons[lessonIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };
    
    // In a real implementation, you would save the updated lesson to the database
    // mockLessons[lessonIndex] = updatedLesson;
    
    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string; lessonId: string } }
) {
  try {
    const lessonId = params.lessonId;
    
    // Find the lesson
    const lessonIndex = mockLessons.findIndex(lesson => lesson.id === lessonId);
    
    if (lessonIndex === -1) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would delete the lesson from the database
    // mockLessons.splice(lessonIndex, 1);
    
    return NextResponse.json(
      { message: "Lesson deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
} 