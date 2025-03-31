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
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Filter lessons by module ID
    const moduleId = params.moduleId;
    const filteredLessons = mockLessons.filter(lesson => lesson.module_id === moduleId);
    
    // Sort by position
    const sortedLessons = [...filteredLessons].sort((a, b) => a.position - b.position);
    
    return NextResponse.json({
      lessons: sortedLessons,
      count: sortedLessons.length
    });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { moduleId } = await params;
    const body = await request.json();
    
    // In a real implementation, you would validate the input and insert into the database
    // For now, we'll create a mock response with generated ID
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: body.title,
      description: body.description,
      content: body.content || "",
      position: body.position || 0,
      status: body.status || "draft",
      module_id: moduleId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // In a real implementation, you would insert the lesson into the database
    // mockLessons.push(newLesson);
    
    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
} 