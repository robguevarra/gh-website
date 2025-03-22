import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import ModuleList from '@/components/admin/module-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const metadata = {
  title: 'Manage Modules | Admin Dashboard',
  description: 'Organize course content by managing modules and lessons.',
};

export default async function ModulesPage({
  params
}: {
  params: { id: string }
}) {
  // Fix the params warning by destructuring
  const { id: courseId } = params;
  
  // Use service role client to bypass RLS
  const serviceClient = createServiceRoleClient();
  
  // Fetch course data to display title
  const { data: course, error: courseError } = await serviceClient
    .from('courses')
    .select('id, title, slug')
    .eq('id', courseId)
    .single();
  
  // If course not found, show 404
  if (courseError || !course) {
    notFound();
  }
  
  // Fetch modules
  const { data: modules, error: modulesError } = await serviceClient
    .from('modules')
    .select(`
      id,
      title,
      description,
      position,
      created_at,
      updated_at
    `)
    .eq('course_id', courseId)
    .order('position', { ascending: true });
  
  // Fetch all lessons for this course
  const { data: allLessons, error: lessonError } = await serviceClient
    .from('lessons')
    .select('id, title, module_id')
    .eq('modules.course_id', courseId);
  
  // Group lessons by module
  const lessonsByModule: Record<string, any[]> = {};
  
  if (allLessons) {
    allLessons.forEach(lesson => {
      if (!lessonsByModule[lesson.module_id]) {
        lessonsByModule[lesson.module_id] = [];
      }
      lessonsByModule[lesson.module_id].push(lesson);
    });
  }
  
  return (
    <div className="space-y-6">
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>Try our new unified course editor!</AlertTitle>
        <AlertDescription className="flex justify-between items-center">
          <span>Manage all aspects of your course in one place with our new enhanced editor.</span>
          <Button asChild size="sm">
            <Link href={`/admin/courses/${courseId}/unified`}>
              Try it now
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-muted-foreground mt-2">
            Manage the modules and lessons for this course
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/courses/${courseId}/unified`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Link>
        </Button>
      </div>

      <Separator />
      
      <ModuleList 
        courseId={courseId}
        courseTitle={course.title}
        modules={modules?.map(module => ({
          ...module,
          lessonCount: (lessonsByModule[module.id] || []).length
        })) || []} 
      />
    </div>
  );
} 