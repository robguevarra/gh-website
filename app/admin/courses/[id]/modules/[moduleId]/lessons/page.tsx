import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, FileText, ExternalLink, Edit, Trash2 } from "lucide-react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  slug: string;
  [key: string]: any;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  position: number;
  course_id: string;
  [key: string]: any;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published';
  position: number;
  content: string | any;
  module_id: string;
  created_at: string;
  updated_at: string;
}

export const metadata = {
  title: "Module Lessons | Admin Dashboard",
  description: "Manage lessons for a course module",
};

export default async function ModuleLessonsPage(
  props: {
    params: Promise<{ id: string; moduleId: string }>;
  }
) {
  const params = await props.params;
  const { id: courseId, moduleId } = params;

  // Create Supabase client
  const supabase = await createServerSupabaseClient();

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

  // Fetch all lessons for this module
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select(`
      id,
      title,
      description,
      status,
      position,
      content,
      created_at,
      updated_at
    `)
    .eq("module_id", moduleId)
    .order("position", { ascending: true });

  if (lessonsError) {
    console.error("Error fetching lessons:", lessonsError);
    return <div>Error loading lessons</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href={`/admin/courses/${courseId}/unified`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course Editor
          </Link>
          <h1 className="text-3xl font-bold mt-2">{module.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <Link href={`/admin/courses/${courseId}/unified`} className="hover:underline">
              {course.title}
            </Link>
            <span>&gt;</span>
            <span className="font-medium text-foreground">{module.title}</span>
          </div>
        </div>
        <div>
          <Link
            href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/new`}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lesson
          </Link>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Module Overview</CardTitle>
              <CardDescription className="mt-1.5">
                Module contains {lessons?.length || 0} lesson{lessons?.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <Badge variant="outline">
              Position: {module.position + 1}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {module.description || "No description provided for this module."}
          </p>
        </CardContent>
      </Card>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Lessons</h2>
        
        {lessons && lessons.length > 0 ? (
          <div className="space-y-3">
            {lessons.map((lesson: Lesson, index: number) => (
              <Card key={lesson.id} className="overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  lesson.status === "published" ? "bg-green-500" : "bg-yellow-500"
                }`} />
                <CardHeader className="pl-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        <Badge variant={lesson.status === "published" ? "default" : "outline"}>
                          {lesson.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {lesson.description || "No description"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Link 
                        href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`}
                        className={buttonVariants({ variant: "default", size: "sm" })}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Content
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-6">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="font-medium">Position:</span> {lesson.position + 1}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(lesson.created_at).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Last Updated:</span> {new Date(lesson.updated_at).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Content Length:</span> {lesson.content ? (
                          typeof lesson.content === 'string' 
                            ? `${lesson.content.length} characters` 
                            : 'Complex content'
                        ) : 'No content'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-medium text-center">No lessons yet</p>
              <p className="text-muted-foreground text-center mb-4">
                This module doesn't have any lessons yet. Add your first lesson to get started.
              </p>
              <Link
                href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/new`}
                className={buttonVariants()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first lesson
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 