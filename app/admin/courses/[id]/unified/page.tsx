import { notFound } from 'next/navigation';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import { UnifiedCourseEditor } from '@/components/admin/unified-course-editor';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye } from 'lucide-react';

export const metadata = {
  title: 'Course Editor | Admin Dashboard',
  description: 'Unified interface to manage course details, modules, and lessons.',
};

export default async function UnifiedCourseEditorPage({ params }: { 
  params: Promise<{ id: string }> 
}) {
  // Get course ID from URL params
  const { id: courseId } = await params;
  
  // Use service role client to bypass RLS
  const serviceClient = createServiceRoleClient();
  
  // Fetch course data
  const { data: course, error: courseError } = await serviceClient
    .from('courses')
    .select(`
      id, 
      title, 
      slug, 
      description, 
      status, 
      is_featured, 
      thumbnail_url,
      trailer_url,
      required_tier_id
    `)
    .eq('id', courseId)
    .single();
  
  // If course not found, show 404
  if (courseError || !course) {
    notFound();
  }

  // Admin actions at top of page
  const AdminActions = () => (
    <div className="mb-6 flex gap-2 justify-end">
      <Button asChild variant="outline" size="sm">
        <Link href={`/courses/${course.slug}?preview=true`}>
          <Eye className="mr-2 h-4 w-4" />
          View Course
        </Link>
      </Button>
    </div>
  );
  
  // Fetch membership tiers
  const { data: membershipTiers, error: tierError } = await serviceClient
    .from('membership_tiers')
    .select('id, name, description');
    
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
    .select(`
      id,
      title,
      description,
      module_id,
      position,
      content,
      created_at,
      updated_at
    `)
    .eq('modules.course_id', courseId)
    .order('position', { ascending: true });
  
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
  
  // Prepare modules with lesson data
  const modulesWithLessons = modules?.map(module => ({
    ...module,
    lessons: lessonsByModule[module.id] || [],
    lessonCount: (lessonsByModule[module.id] || []).length
  })) || [];
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Editor</h1>
        <p className="text-muted-foreground mt-2">
          Manage all aspects of your course in one place.
        </p>
      </div>
      
      <AdminActions />
      
      <UnifiedCourseEditor
        course={course}
        modules={modulesWithLessons}
        membershipTiers={membershipTiers || []}
      />
    </div>
  );
} 