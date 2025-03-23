import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BookOpen,
  Clock,
  FileText,
  Lock,
  Play,
  Star,
} from 'lucide-react';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { formatPrice } from '@/lib/format';
import { parseISO, formatRelative } from 'date-fns';
import { getModulesWithLessons } from '@/lib/courses';
import CourseProgress from '@/components/courses/course-progress';
import LessonListItem from '@/components/courses/lesson-list-item';

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }) {
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
    title: `${course.title} | Graceful Homeschooling`,
    description: course.description || 'Learn with Graceful Homeschooling',
  };
}

export default async function CoursePage({ 
  params,
  searchParams
}: { 
  params: Promise<{ slug: string }>;
  searchParams: { preview?: string };
}) {
  // Await params to properly handle dynamic API
  const { slug } = await params;
  
  // Get the authenticated user if available
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Use service role client to bypass RLS for fetching course data
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
      trailer_url,
      status,
      is_featured,
      required_tier_id,
      membership_tiers(id, name, price_monthly, price_yearly)
    `)
    .eq('slug', slug)
    .single();
  
  // If course not found, show 404
  if (courseError || !course) {
    notFound();
  }
  
  // Check if user is an admin to view draft courses
  let isAdmin = false;
  if (user) {
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    isAdmin = (profile?.role === 'admin' || profile?.is_admin === true);
  }
  
  // If course is draft and user is not admin, show 404
  if (course.status !== 'published' && !isAdmin) {
    notFound();
  }
  
  // Check if viewing in admin preview mode
  const isPreviewMode = searchParams?.preview === 'true' && isAdmin;
  
  // Check if user has access to this course
  let hasAccess = false;
  
  if (isPreviewMode) {
    // In preview mode, simulate regular user access rules
    if (!course.required_tier_id) {
      // Course is free, simulating logged-in user
      hasAccess = true;
    }
    // For courses with tier requirements, leave hasAccess as false to simulate non-enrolled user
  } else if (user) {
    // Normal access check for logged in users
    // Check if user has required membership tier
    if (course.required_tier_id) {
      const { data: userMembership, error: membershipError } = await supabase
        .from('user_memberships')
        .select('id, status, membership_tier_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      // User has access if they have an active membership with the required tier or higher
      // This assumes that higher tier IDs mean higher access levels
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
  
  // Fetch all lessons for this course
  const { data: lessons, error: lessonsError } = await serviceClient
    .from('lessons')
    .select(`
      id,
      title,
      description,
      status,
      position,
      module_id
    `)
    .eq('modules.course_id', course.id)
    .order('position', { ascending: true });
  
  // Organize lessons by module
  const moduleWithLessons = modules?.map(module => {
    const moduleLessons = lessons?.filter(lesson => lesson.module_id === module.id) || [];
    return {
      ...module,
      lessons: moduleLessons,
      lessonCount: moduleLessons.length
    };
  }) || [];
  
  // Total content stats
  const totalLessons = lessons?.length || 0;
  const totalModules = modules?.length || 0;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Details (Left Column on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            {course.is_featured && (
              <Badge className="mb-2 bg-amber-100 text-amber-800 hover:bg-amber-200">
                <Star className="mr-1 h-3 w-3" /> Featured Course
              </Badge>
            )}
            {course.status === 'draft' && (
              <Badge className="mb-2 mr-2" variant="outline">
                Draft
              </Badge>
            )}
            {isAdmin && !isPreviewMode && (
              <Badge className="mb-2 mr-2 bg-purple-100 text-purple-800">
                Admin View
              </Badge>
            )}
            {isPreviewMode && (
              <Badge className="mb-2 mr-2 bg-blue-100 text-blue-800">
                Student Preview Mode
              </Badge>
            )}
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl mb-2">{course.title}</h1>
            <p className="text-muted-foreground">{course.description}</p>
          </div>
          
          {/* Course image/video */}
          <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
            {course.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt={course.title}
                width={1200}
                height={675}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Course trailer button */}
          {course.trailer_url && (
            <div className="flex justify-center">
              <Button variant="outline" size="lg" className="mt-4">
                <Play className="mr-2 h-4 w-4" /> Watch Course Trailer
              </Button>
            </div>
          )}
          
          {/* Course contents */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Course Contents</h2>
            
            {/* Course stats */}
            <div className="flex gap-4 mb-6">
              <div className="flex items-center">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {totalModules} {totalModules === 1 ? 'Module' : 'Modules'}
                </span>
              </div>
              <div className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {/* Estimate 15 minutes per lesson */}
                  {Math.ceil(totalLessons * 15 / 60)} hours of content
                </span>
              </div>
            </div>
            
            {/* Modules and lessons accordion */}
            {moduleWithLessons.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {moduleWithLessons.map((module) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="text-left">
                      <div>
                        <div className="font-medium">{module.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {module.lessonCount} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 pl-6">
                        {module.lessons.map((lesson) => (
                          <li key={lesson.id} className="border-b pb-2 last:border-0">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center">
                                {hasAccess ? (
                                  <Link href={`/courses/${course.slug}/learn/${lesson.id}`} className="hover:underline flex items-center">
                                    <BookOpen className="mr-2 h-4 w-4 text-primary" />
                                    <span>{lesson.title}</span>
                                  </Link>
                                ) : (
                                  <div className="flex items-center text-muted-foreground">
                                    <Lock className="mr-2 h-4 w-4" />
                                    <span>{lesson.title}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {lesson.description && (
                              <p className="text-sm text-muted-foreground mt-1 ml-6">
                                {lesson.description}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="p-6 text-center border rounded-lg">
                <p className="text-muted-foreground">Content for this course is being prepared.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar (Right Column on desktop) */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 border rounded-lg p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Enroll in this course</h3>
              
              {hasAccess ? (
                <div className="space-y-4">
                  <div className="bg-green-50 text-green-700 p-3 rounded-md">
                    You have access to this course!
                  </div>
                  
                  <Button className="w-full" asChild>
                    <Link href={totalLessons > 0 ? `/courses/${course.slug}/learn` : '#'}>
                      Start Learning
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {course.required_tier_id ? (
                    <>
                      <div className="border-b pb-4">
                        <p className="mb-2 text-muted-foreground">
                          This course requires {course.membership_tiers && course.membership_tiers[0]?.name} membership or higher.
                        </p>
                        <div className="flex items-baseline justify-between">
                          <div className="text-2xl font-bold">
                            ${course.membership_tiers && course.membership_tiers[0]?.price_monthly}
                            <span className="text-sm font-normal text-muted-foreground ml-1">/month</span>
                          </div>
                          {course.membership_tiers && course.membership_tiers[0]?.price_yearly && (
                            <div className="text-sm">
                              ${course.membership_tiers[0].price_yearly}
                              <span className="text-xs text-muted-foreground ml-1">/year</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button className="w-full" asChild>
                        <Link href="/pricing">
                          Subscribe to {course.membership_tiers && course.membership_tiers[0]?.name}
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">
                        Sign in to access this free course.
                      </p>
                      <Button className="w-full" asChild>
                        <Link href={`/auth/signin?callbackUrl=/courses/${course.slug}`}>
                          Sign in to Continue
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">This course includes:</h4>
              <ul className="space-y-2">
                <li className="flex items-center text-sm">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  {totalLessons} lessons
                </li>
                <li className="flex items-center text-sm">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {Math.ceil(totalLessons * 15 / 60)} hours of content
                </li>
                <li className="flex items-center text-sm">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  Downloadable resources
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 