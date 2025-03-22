import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import CourseList from '@/components/admin/course-list';

export const metadata = {
  title: 'Course Management | Admin Dashboard',
  description: 'Manage courses, modules, and lessons for the Graceful Homeschooling platform.',
};

export default async function CoursesPage() {
  // Use service role client to bypass RLS for admin operations
  const serviceClient = createServiceRoleClient();
  
  // Fetch courses with stats
  const { data: courses, error } = await serviceClient
    .from('courses')
    .select(`
      id, 
      title, 
      slug, 
      description, 
      status, 
      is_featured, 
      thumbnail_url,
      created_at,
      updated_at,
      required_tier_id,
      membership_tiers(name)
    `)
    .order('updated_at', { ascending: false });

  // Fetch all modules to count per course
  const { data: allModules, error: moduleError } = await serviceClient
    .from('modules')
    .select('course_id');

  // Fetch all lessons to count per course
  const { data: allLessons, error: lessonError } = await serviceClient
    .from('lessons')
    .select('module_id');
    
  // Get all module IDs per course
  const { data: moduleMap, error: moduleMapError } = await serviceClient
    .from('modules')
    .select('id, course_id');
  
  // Fetch membership tiers for filtering
  const { data: membershipTiers, error: tierError } = await serviceClient
    .from('membership_tiers')
    .select('id, name, description');
    
  // Count modules per course
  const moduleCounts: Record<string, number> = {};
  if (allModules) {
    allModules.forEach(module => {
      const courseId = module.course_id;
      moduleCounts[courseId] = (moduleCounts[courseId] || 0) + 1;
    });
  }
  
  // Create a map of module ID to course ID
  const moduleToCourseLookup: Record<string, string> = {};
  if (moduleMap) {
    moduleMap.forEach(module => {
      moduleToCourseLookup[module.id] = module.course_id;
    });
  }
  
  // Count lessons per course using the module-to-course lookup
  const lessonCounts: Record<string, number> = {};
  if (allLessons) {
    allLessons.forEach(lesson => {
      const courseId = moduleToCourseLookup[lesson.module_id];
      if (courseId) {
        lessonCounts[courseId] = (lessonCounts[courseId] || 0) + 1;
      }
    });
  }

  // Calculate course stats
  const coursesWithStats = courses?.map(course => {
    return {
      ...course,
      moduleCount: moduleCounts[course.id] || 0,
      lessonCount: lessonCounts[course.id] || 0,
      tierName: course.membership_tiers?.name || 'None'
    };
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Management</h1>
        <p className="text-muted-foreground mt-2">
          Create, edit, and manage courses available on the platform.
        </p>
      </div>
      
      <CourseList 
        courses={coursesWithStats} 
        membershipTiers={membershipTiers || []} 
      />
    </div>
  );
} 