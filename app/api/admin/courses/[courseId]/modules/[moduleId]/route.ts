import { NextRequest, NextResponse } from "next/server";

interface Module {
  id: string;
  title: string;
  description: string;
  position: number;
  status: 'draft' | 'published' | 'archived';
  course_id: string;
  created_at: string;
  updated_at: string;
}

// Mock modules data for testing
const mockModules: Module[] = [
  {
    id: "module1",
    title: "Getting Started",
    description: "Introduction to the course and basic concepts",
    position: 0,
    status: "published",
    course_id: "course1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "module2",
    title: "Core Concepts",
    description: "Fundamental principles and techniques",
    position: 1,
    status: "published",
    course_id: "course1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "module3",
    title: "Advanced Topics",
    description: "Advanced techniques and deep dives",
    position: 2,
    status: "draft",
    course_id: "course1",
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
    
    const moduleId = params.moduleId;
    const module = mockModules.find(module => module.id === moduleId);
    
    if (!module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(module);
  } catch (error) {
    console.error("Error fetching module:", error);
    return NextResponse.json(
      { error: "Failed to fetch module" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const moduleId = params.moduleId;
    const body = await request.json();
    
    // Find the module to update
    const moduleIndex = mockModules.findIndex(module => module.id === moduleId);
    
    if (moduleIndex === -1) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would update the module in the database
    // For now, let's create an updated version
    const updatedModule: Module = {
      ...mockModules[moduleIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };
    
    // In a real implementation, you would save the updated module to the database
    // mockModules[moduleIndex] = updatedModule;
    
    return NextResponse.json(updatedModule);
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json(
      { error: "Failed to update module" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const moduleId = params.moduleId;
    
    // Find the module
    const moduleIndex = mockModules.findIndex(module => module.id === moduleId);
    
    if (moduleIndex === -1) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would delete the module from the database
    // mockModules.splice(moduleIndex, 1);
    
    return NextResponse.json(
      { message: "Module deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json(
      { error: "Failed to delete module" },
      { status: 500 }
    );
  }
} 