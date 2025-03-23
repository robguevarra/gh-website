import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import ModuleList from '@/components/admin/module-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Manage Modules | Admin Dashboard',
  description: 'Organize course content by managing modules and lessons.',
};

export default async function ModulesPage({
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Await params to properly handle dynamic API
  const { id } = await params;
  
  // Use service role client to bypass RLS
  const serviceClient = createServiceRoleClient();
  
  // Fetch course
  const { data: course, error: courseError } = await serviceClient
    .from('courses')
    .select('id, title, slug, status')
    .eq('id', id)
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
    .eq('course_id', id)
    .order('position', { ascending: true });
  
  // Fetch all lessons for this course to count them per module
  const { data: allLessons, error: lessonError } = await serviceClient
    .from('lessons')
    .select('id, module_id')
    .eq('modules.course_id', id);
    
  // Calculate module stats with lesson counts
  const modulesWithStats = modules?.map(module => {
    const moduleLesson = allLessons?.filter(lesson => lesson.module_id === module.id) || [];
    const lessonCount = moduleLesson.length;
    
    return {
      ...module,
      lessonCount,
    };
  }) || [];
  
  return (
    <div className="space-y-6">
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>Try our new unified course editor!</AlertTitle>
        <AlertDescription className="flex justify-between items-center">
          <span>Manage all aspects of your course in one place with our new enhanced editor.</span>
          <Button asChild size="sm">
            <Link href={`/admin/courses/${id}/unified`}>
              Try it now
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Modules for {course.title}
        </h1>
        <p className="text-muted-foreground mt-2">
          Organize your course content by creating and arranging modules and lessons.
        </p>
      </div>
      
      <ModuleList
        courseId={id}
        courseTitle={course.title} 
        modules={modulesWithStats}
      />
    </div>
  );
} 