import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { LessonProgress } from '@/components/courses/lesson-progress';

export async function generateMetadata({ params }: { params: { slug: string; lessonId: string } }) {
  const serviceClient = createServiceRoleClient();
  
  // Fetch lesson details
  const { data: lesson } = await serviceClient
    .from('lessons')
    .select(`
      title,
      description,
      modules!inner(
        course_id, 
        courses!inner(
          title, 
          slug
        )
      )
    `)
    .eq('id', params.lessonId)
    .eq('status', 'published')
    .single();
  
  if (!lesson) {
    return {
      title: 'Lesson Not Found',
      description: 'The requested lesson could not be found.',
    };
  }
  
  const courseName = lesson.modules?.courses?.title || '';
  
  return {
    title: `${lesson.title} | ${courseName} | Graceful Homeschooling`,
    description: lesson.description || `Learn ${lesson.title} with Graceful Homeschooling`,
  };
}

export default async function LessonPage({ params }: { params: { slug: string; lessonId: string } }) {
  // Get the authenticated user
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!user) {
    // Redirect to sign in if not authenticated
    return redirect(`/auth/signin?callbackUrl=/courses/${params.slug}/learn/${params.lessonId}`);
  }
  
  // Use service role client to bypass RLS for lesson data
  const serviceClient = createServiceRoleClient();
  
  // Fetch the course by slug
  const { data: course, error: courseError } = await serviceClient
    .from('courses')
    .select(`
      id,
      title,
      slug,
      description,
      status,
      required_tier_id,
      membership_tiers(id, name)
    `)
    .eq('slug', params.slug)
    .single();

  if (courseError || !course) {
    notFound();
  }
  
  // Fetch the lesson with course and module information
  const { data: lesson, error: lessonError } = await serviceClient
    .from('lessons')
    .select(`
      *,
      modules: module_id (
        id,
        title,
        position,
        course_id
      )
    `)
    .eq('id', params.lessonId)
    .maybeSingle();
  
  // If lesson not found or not published, show 404
  if (lessonError || !lesson) {
    notFound();
  }
  
  const module = lesson.modules;
  
  if (!course || !module) {
    notFound();
  }
  
  // Check if user has access to this course
  let hasAccess = false;
  
  // Check if user has required membership tier
  if (course.required_tier_id) {
    const { data: userMembership, error: membershipError } = await supabase
      .from('user_memberships')
      .select('id, status, membership_tier_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    
    // User has access if they have an active membership with the required tier or higher
    if (userMembership && userMembership.membership_tier_id >= course.required_tier_id) {
      hasAccess = true;
    }
  } else {
    // Course has no tier requirement, so all logged-in users have access
    hasAccess = true;
  }
  
  // Check for specific enrollment in this course (if needed)
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('user_enrollments')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .eq('status', 'active')
    .maybeSingle();
  
  if (enrollment) {
    hasAccess = true;
  }
  
  // If user doesn't have access, redirect to course page
  if (!hasAccess) {
    return redirect(`/courses/${params.slug}`);
  }
  
  // Fetch user's progress for this lesson
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle();
  
  // If no progress record exists, create one
  if (!progress) {
    await supabase.from('user_progress').insert({
      user_id: user.id,
      lesson_id: lesson.id,
      completion_percentage: 0,
      is_completed: false,
      last_position: 0,
    });
  }
  
  // Get lessons in the current module for navigation
  const { data: moduleWithLessons, error: moduleLessonsError } = await serviceClient
    .from('modules')
    .select(`
      id,
      title,
      lessons(
        id,
        title,
        position,
        status
      )
    `)
    .eq('id', module.id)
    .single();
  
  // Filter only published lessons and sort by position
  const publishedLessons = moduleWithLessons?.lessons
    .filter((l: any) => l.status === 'published')
    .sort((a: any, b: any) => a.position - b.position) || [];
  
  // Find current lesson index and adjacent lessons for navigation
  const currentIndex = publishedLessons.findIndex((l: any) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? publishedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < publishedLessons.length - 1 ? publishedLessons[currentIndex + 1] : null;
  
  // List all modules in the course for sidebar navigation
  const { data: courseModules, error: courseModulesError } = await serviceClient
    .from('modules')
    .select(`
      id,
      title,
      position,
      lessons(
        id,
        title,
        position,
        status
      )
    `)
    .eq('course_id', course.id)
    .order('position', { ascending: true });
  
  // Prepare all modules and their published lessons for sidebar
  const allModulesWithLessons = courseModules?.map(m => ({
    ...m,
    lessons: m.lessons
      .filter((l: any) => l.status === 'published')
      .sort((a: any, b: any) => a.position - b.position)
  })) || [];
  
  // Get progress for all lessons for the sidebar
  const allLessonIds = allModulesWithLessons.flatMap(m => m.lessons.map((l: any) => l.id));
  
  const { data: allProgress, error: allProgressError } = await supabase
    .from('user_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', user.id)
    .in('lesson_id', allLessonIds);
  
  // Mark lesson as viewed (update progress)
  await supabase
    .from('user_progress')
    .upsert({
      user_id: user.id,
      lesson_id: lesson.id,
      last_viewed_at: new Date().toISOString(),
      // Keep existing completion data
      ...(progress && {
        completion_percentage: progress.completion_percentage,
        is_completed: progress.is_completed,
        last_position: progress.last_position,
      })
    });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top navigation */}
      <div className="border-b">
        <div className="container flex items-center justify-between py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/courses/${course.slug}/learn`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Course
            </Link>
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Main lesson content */}
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">{lesson.title}</h1>
              {lesson.description && (
                <p className="text-muted-foreground">{lesson.description}</p>
              )}
              
              <div className="prose prose-stone dark:prose-invert max-w-none">
                {/* Render the lesson content */}
                <div dangerouslySetInnerHTML={{ __html: lesson.content || '<p>No content available for this lesson.</p>' }} />
              </div>
            </div>
            
            {/* Lesson progress component */}
            <div className="pt-8 border-t">
              <LessonProgress 
                lessonId={lesson.id}
                courseSlug={course.slug}
                nextLessonId={nextLesson?.id}
                isLastLesson={!nextLesson}
                initialProgress={progress ? {
                  completion_percentage: progress.completion_percentage || 0,
                  is_completed: progress.is_completed || false,
                } : undefined}
              />
            </div>
            
            {/* Lesson navigation */}
            <div className="flex justify-between pt-4 border-t">
              {prevLesson ? (
                <Button variant="outline" asChild>
                  <Link href={`/courses/${course.slug}/learn/${prevLesson.id}`}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous Lesson
                  </Link>
                </Button>
              ) : (
                <div></div>
              )}
              
              <div></div>
            </div>
          </div>
          
          {/* Sidebar with course outline */}
          <div className="md:col-span-1">
            <Card className="sticky top-4">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <p className="text-sm text-muted-foreground">Course Content</p>
              </div>
              
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {allModulesWithLessons.map((m) => (
                  <div key={m.id} className="space-y-2">
                    <h4 className="font-medium">{m.title}</h4>
                    <ul className="space-y-1 pl-4">
                      {m.lessons.map((l: any) => {
                        const isCompleted = allProgress?.some(p => p.lesson_id === l.id && p.is_completed) || false;
                        const isCurrent = l.id === lesson.id;
                        
                        return (
                          <li key={l.id}>
                            <Link 
                              href={`/courses/${course.slug}/learn/${l.id}`} 
                              className={`text-sm flex items-center py-1 ${isCurrent ? 'text-primary font-medium' : ''} ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
                            >
                              {isCompleted ? '✓ ' : '○ '}
                              <span className="ml-2">{l.title}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 