import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { LessonList } from "@/components/admin/lesson-list";

export const metadata = {
  title: "Manage Lessons | Admin Dashboard",
  description: "Manage lessons for a course module",
};

export default async function ModuleLessonsPage({
  params,
}: {
  params: { id: string; moduleId: string };
}) {
  const courseId = params.id;
  const moduleId = params.moduleId;
  
  try {
    const supabase = await createServiceRoleClient();
    
    // Fetch the course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();
    
    if (courseError || !course) {
      console.error("Error fetching course:", courseError);
      notFound();
    }
    
    // Fetch the module
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .eq("course_id", courseId)
      .single();
    
    if (moduleError || !module) {
      console.error("Error fetching module:", moduleError);
      notFound();
    }
    
    // Fetch the lessons for this module
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
  } catch (error) {
    console.error("Error fetching data:", error);
    return (
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        <h1 className="text-3xl font-bold">Error loading lessons</h1>
        <p>There was an error loading the lessons for this module.</p>
      </div>
    );
  }
} 