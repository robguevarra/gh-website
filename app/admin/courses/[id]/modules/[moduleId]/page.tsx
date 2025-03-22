import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LessonList } from "@/components/admin/lesson-list";

export const metadata = {
  title: "Manage Lessons | Admin Dashboard",
  description: "Manage lessons for a course module",
};

export default async function ModuleDetailPage({ params }: { 
  params: Promise<{ id: string; moduleId: string }> 
}) {
  // Get IDs from URL params
  const { id: courseId, moduleId } = await params;
  
  // Create the Supabase client
  const supabase = await createServerSupabaseClient();
  
  // Fetch course and module data in parallel
  const [courseResponse, moduleResponse] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).single(),
    supabase.from("modules").select("*").eq("id", moduleId).eq("course_id", courseId).single()
  ]);
  
  // Check if course exists
  if (courseResponse.error || !courseResponse.data) {
    console.error("Error fetching course:", courseResponse.error);
    notFound();
  }
  
  // Check if module exists and belongs to course
  if (moduleResponse.error || !moduleResponse.data) {
    console.error("Error fetching module:", moduleResponse.error);
    notFound();
  }
  
  const course = courseResponse.data;
  const module = moduleResponse.data;
  
  // Fetch lessons for the module
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("position", { ascending: true });
  
  if (lessonsError) {
    console.error("Error fetching lessons:", lessonsError);
    return (
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        <h1 className="text-3xl font-bold">Error loading lessons</h1>
        <p>There was an error loading the lessons for this module.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{module.title}</h1>
          <p className="text-muted-foreground">
            {course.title} &gt; {module.title}
          </p>
        </div>
      </div>
      
      <div className="grid gap-6">
        <LessonList 
          courseId={courseId} 
          moduleId={moduleId} 
          moduleTitle={module.title} 
          initialLessons={lessons || []} 
        />
      </div>
    </div>
  );
} 