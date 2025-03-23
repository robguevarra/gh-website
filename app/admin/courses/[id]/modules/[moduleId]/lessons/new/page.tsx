import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * This page just redirects to the module's lessons page with the "Add Lesson" dialog open.
 * The actual lesson creation is handled by the client-side component in course-modules-manager.tsx.
 * This URL is just a convenience endpoint for linking to the lesson creation flow.
 */
export default async function CreateLessonPage(
  props: {
    params: Promise<{ id: string; moduleId: string }>;
  }
) {
  const params = await props.params;
  const { id: courseId, moduleId } = params;

  // Verify the course and module exist before redirecting
  const supabase = await createServerSupabaseClient();

  // Check course exists
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    redirect("/admin/courses");
  }

  // Check module exists
  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("id")
    .eq("id", moduleId)
    .eq("course_id", courseId)
    .single();

  if (moduleError || !module) {
    redirect(`/admin/courses/${courseId}/unified`);
  }

  // Redirect to the unified course editor page with the modules tab active
  redirect(`/admin/courses/${courseId}/unified?tab=modules`);
} 