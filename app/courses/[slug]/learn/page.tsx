import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, ChevronRight, Play } from 'lucide-react';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const serviceClient = createServiceRoleClient();

  const { data: course } = await serviceClient
    .from('courses')
    .select('title, description')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single();

  if (!course) {
    return {
      title: 'Course Not Found',
      description: 'The requested course could not be found.',
    };
  }

  return {
    title: `Learn: ${course.title} | Graceful Homeschooling`,
    description: course.description || 'Learn with Graceful Homeschooling',
  };
}

export default async function CourseLearnPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  // Get the authenticated user
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to sign in if not authenticated
    return redirect(`/auth/signin?callbackUrl=/courses/${params.slug}/learn`);
  }

  // Use service role client to bypass RLS for course data
  const serviceClient = createServiceRoleClient();

  // Fetch the course by slug
  const { data: course, error: courseError } = await serviceClient
    .from('courses')
    .select(`
      id,
      title,
      slug,
      description,
      thumbnail_url,
      status,
      required_tier_id
    `)
    .eq('slug', params.slug)
    .single();

  if (courseError || !course) {
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

  // Fetch modules for this course
  const { data: modules, error: modulesError } = await serviceClient
    .from('modules')
    .select(`
      id,
      title,
      description,
      position
    `)
    .eq('course_id', course.id)
    .order('position', { ascending: true });

  // Fetch all lessons
  const { data: allLessons, error: lessonsError } = await serviceClient
    .from('lessons')
    .select(`
      id,
      title,
      description,
      content,
      status,
      position,
      module_id
    `)
    .eq('modules.course_id', course.id)
    .order('position', { ascending: true });

  // Get user's progress for lessons in this course
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select(`
      id,
      lesson_id,
      completion_percentage,
      is_completed,
      last_position,
      updated_at
    `)
    .eq('user_id', user.id)
    .in('lesson_id', allLessons?.map(lesson => lesson.id) || []);

  // Organize lessons by module with progress
  const modulesWithLessons = modules?.map(module => {
    const moduleLessons = allLessons?.filter(lesson => lesson.module_id === module.id) || [];
    
    // Add progress data to each lesson
    const lessonsWithProgress = moduleLessons.map(lesson => {
      const lessonProgress = progress?.find(p => p.lesson_id === lesson.id);
      return {
        ...lesson,
        progress: lessonProgress?.completion_percentage || 0,
        is_completed: lessonProgress?.is_completed || false,
        last_position: lessonProgress?.last_position || null,
      };
    });
    
    // Calculate module completion
    const completedLessons = lessonsWithProgress.filter(lesson => lesson.is_completed).length;
    const moduleProgress = moduleLessons.length > 0
      ? Math.round((completedLessons / moduleLessons.length) * 100)
      : 0;
    
    return {
      ...module,
      lessons: lessonsWithProgress,
      lessonCount: lessonsWithProgress.length,
      completedLessons,
      progress: moduleProgress,
    };
  }) || [];

  // Calculate overall course progress
  const totalLessons = allLessons?.length || 0;
  const completedLessons = progress?.filter(p => p.is_completed).length || 0;
  const courseProgress = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // Find the next lesson to continue (first incomplete lesson)
  const findNextLesson = () => {
    for (const module of modulesWithLessons) {
      for (const lesson of module.lessons) {
        if (!lesson.is_completed) {
          return lesson;
        }
      }
    }
    // If all lessons are completed, return the first lesson
    return modulesWithLessons[0]?.lessons[0] || null;
  };

  const nextLesson = findNextLesson();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Course Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">{course.description}</p>
          </div>
          
          {nextLesson && (
            <Button asChild>
              <Link href={`/courses/${course.slug}/learn/${nextLesson.id}`}>
                <Play className="mr-2 h-4 w-4" />
                {nextLesson.is_completed ? 'Review' : 'Continue'} Learning
              </Link>
            </Button>
          )}
        </div>
        
        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {completedLessons} of {totalLessons} lessons completed
                </span>
                <span className="text-sm font-medium">{courseProgress}%</span>
              </div>
              <Progress value={courseProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
        
        {/* Modules & Lessons */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold">Course Content</h2>
          
          {modulesWithLessons.length > 0 ? (
            <div className="space-y-6">
              {modulesWithLessons.map((module) => (
                <div key={module.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{module.title}</h3>
                    <span className="text-sm text-muted-foreground">
                      {module.completedLessons}/{module.lessonCount} complete
                    </span>
                  </div>
                  
                  {module.description && (
                    <p className="text-muted-foreground">{module.description}</p>
                  )}
                  
                  <Progress value={module.progress} className="h-1.5" />
                  
                  <div className="space-y-2">
                    {module.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={`/courses/${course.slug}/learn/${lesson.id}`}
                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center space-x-3">
                          {lesson.is_completed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-primary" />
                          )}
                          <span>{lesson.title}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                  Content is being prepared for this course.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 