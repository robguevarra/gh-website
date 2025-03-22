import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LessonBasicEditor } from "@/components/admin/lesson-basic-editor";

export const metadata = {
  title: "Lesson Editor | Admin Dashboard",
  description: "Edit lesson content and settings",
};

export default async function LessonEditorPage({
  params,
}: {
  params: { id: string; moduleId: string; lessonId: string };
}) {
  const { id: courseId, moduleId, lessonId } = params;
  
  // Create Supabase client with service role to bypass RLS
  const supabase = createServerSupabaseClient();
  
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
  
  // Fetch the lesson
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("module_id", moduleId)
    .single();
  
  if (lessonError || !lesson) {
    console.error("Error fetching lesson:", lessonError);
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href={`/admin/courses/${courseId}/modules/${moduleId}`}
            className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to lessons
          </Link>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <span>{course.title}</span>
            <span>&gt;</span>
            <span>{module.title}</span>
            <span>&gt;</span>
            <span className="font-medium text-foreground">{lesson.title}</span>
            {lesson.status === "draft" && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-600">
                Draft
              </Badge>
            )}
            {lesson.status === "published" && (
              <Badge variant="outline" className="bg-green-50 text-green-600">
                Published
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/courses/${courseId}/modules/${moduleId}`}>
              Cancel
            </Link>
          </Button>
        </div>
      </div>
      
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4 flex items-start gap-2">
          <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800">
              This is a basic lesson editor. As the platform evolves, we&apos;ll implement a more robust editor with rich media support and interactive elements.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="space-y-4 mt-6">
          <LessonBasicEditor 
            lesson={lesson} 
            courseId={courseId} 
            moduleId={moduleId} 
          />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lesson settings will be implemented in a future update. For now, you can edit the lesson title and description from the module page.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 