import { createServerSupabaseClient } from '@/lib/supabase/client';
import { type Database } from '@/types/supabase';

/**
 * Get all active enrollments for a user
 */
export const getUserEnrollments = async ({ 
  userId, 
  includeExpired = false 
}: { 
  userId: string; 
  includeExpired?: boolean;
}) => {
  const supabase = createServerSupabaseClient();
  
  const query = supabase
    .from('user_enrollments')
    .select(`
      id,
      user_id,
      course_id,
      enrolled_at,
      expires_at,
      status,
      payment_id,
      created_at,
      updated_at,
      courses:course_id (
        id,
        title,
        description,
        slug,
        cover_image
      )
    `)
    .eq('user_id', userId);
    
  if (!includeExpired) {
    query.eq('status', 'active');
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching user enrollments:', error);
    throw error;
  }
  
  return data.map((enrollment: any) => ({
    id: enrollment.id,
    userId: enrollment.user_id,
    courseId: enrollment.course_id,
    enrolledAt: enrollment.enrolled_at,
    expiresAt: enrollment.expires_at,
    status: enrollment.status,
    paymentId: enrollment.payment_id,
    createdAt: enrollment.created_at,
    updatedAt: enrollment.updated_at,
    course: enrollment.courses ? {
      id: enrollment.courses.id,
      title: enrollment.courses.title,
      description: enrollment.courses.description,
      slug: enrollment.courses.slug,
      coverImage: enrollment.courses.cover_image
    } : undefined
  }));
};

/**
 * Get course progress for a user
 */
export const getUserCourseProgress = async ({ 
  userId, 
  courseId 
}: { 
  userId: string; 
  courseId: string;
}) => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is the "not found" error code
    console.error('Error fetching course progress:', error);
    throw error;
  }
  
  if (!data) {
    return null;
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    courseId: data.course_id,
    progressPercentage: data.progress_percentage,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    lastAccessedAt: data.last_accessed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

/**
 * Get module progress for a user and course
 */
export const getUserModuleProgress = async ({ 
  userId, 
  courseId 
}: { 
  userId: string; 
  courseId: string;
}) => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('module_progress')
    .select(`
      id,
      user_id,
      module_id,
      progress_percentage,
      started_at,
      completed_at,
      last_accessed_at,
      created_at,
      updated_at,
      modules:module_id (
        id,
        title,
        order,
        course_id
      )
    `)
    .eq('user_id', userId)
    .eq('modules.course_id', courseId);
  
  if (error) {
    console.error('Error fetching module progress:', error);
    throw error;
  }
  
  return data.map((progress: any) => ({
    id: progress.id,
    userId: progress.user_id,
    moduleId: progress.module_id,
    progressPercentage: progress.progress_percentage,
    startedAt: progress.started_at,
    completedAt: progress.completed_at,
    lastAccessedAt: progress.last_accessed_at,
    createdAt: progress.created_at,
    updatedAt: progress.updated_at,
    module: progress.modules ? {
      id: progress.modules.id,
      title: progress.modules.title,
      order: progress.modules.order
    } : undefined
  }));
};

/**
 * Get lesson progress for a user
 */
export const getUserLessonProgress = async ({ 
  userId,
  courseId
}: { 
  userId: string;
  courseId: string;
}) => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_progress')
    .select(`
      id,
      user_id,
      lesson_id,
      status,
      progress_percentage,
      last_position,
      completed_at,
      created_at,
      updated_at,
      lessons:lesson_id (
        id,
        title,
        module_id,
        order,
        duration,
        modules:module_id (
          course_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('lessons.modules.course_id', courseId);
  
  if (error) {
    console.error('Error fetching lesson progress:', error);
    throw error;
  }
  
  return data.map((progress: any) => ({
    id: progress.id,
    userId: progress.user_id,
    lessonId: progress.lesson_id,
    status: progress.status,
    progressPercentage: progress.progress_percentage,
    lastPosition: progress.last_position,
    completedAt: progress.completed_at,
    createdAt: progress.created_at,
    updatedAt: progress.updated_at,
    lesson: progress.lessons ? {
      id: progress.lessons.id,
      title: progress.lessons.title,
      moduleId: progress.lessons.module_id,
      order: progress.lessons.order,
      duration: progress.lessons.duration
    } : undefined
  }));
};

/**
 * Calculate overall course progress from lessons
 */
export const calculateCourseProgress = async ({
  userId,
  courseId
}: {
  userId: string;
  courseId: string;
}) => {
  const supabase = createServerSupabaseClient();
  
  // Get all lessons for the course
  const { data: lessonsData, error: lessonsError } = await supabase
    .from('lessons')
    .select(`
      id,
      modules:module_id (
        course_id
      )
    `)
    .eq('modules.course_id', courseId);
    
  if (lessonsError) {
    console.error('Error fetching lessons:', lessonsError);
    throw lessonsError;
  }
  
  // Get progress for all of the user's lessons in this course
  const { data: progressData, error: progressError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('lesson_id', lessonsData.map(lesson => lesson.id));
    
  if (progressError) {
    console.error('Error fetching lesson progress:', progressError);
    throw progressError;
  }
  
  // Calculate overall percentage
  const totalLessons = lessonsData.length;
  const lessonsWithProgress = progressData.length;
  const completedLessons = progressData.filter((p: any) => p.progress_percentage === 100).length;
  const totalPercentage = progressData.reduce((sum: number, p: any) => sum + Number(p.progress_percentage), 0);
  
  // If user hasn't started any lessons, return 0%
  if (lessonsWithProgress === 0) {
    return {
      progressPercentage: 0,
      completedLessons: 0,
      totalLessons,
      hasStarted: false
    };
  }
  
  // Calculate average progress
  const progressPercentage = Math.round(totalPercentage / totalLessons);
  
  return {
    progressPercentage,
    completedLessons,
    totalLessons,
    hasStarted: lessonsWithProgress > 0
  };
};

/**
 * Get time spent data for a user on a specific course
 */
export const getUserTimeSpent = async ({
  userId,
  courseId
}: {
  userId: string;
  courseId: string;
}) => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_time_spent')
    .select(`
      id,
      user_id,
      lesson_id,
      duration_seconds,
      last_activity,
      lessons:lesson_id (
        modules:module_id (
          course_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('lessons.modules.course_id', courseId);
    
  if (error) {
    console.error('Error fetching time spent:', error);
    throw error;
  }
  
  // Calculate total time spent in seconds
  const totalSeconds = data.reduce((total: number, entry: any) => total + entry.duration_seconds, 0);
  
  // Convert to hours and minutes
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  return {
    totalSeconds,
    formatted: `${hours}h ${minutes}m`,
    entries: data
  };
};

/**
 * Update user progress for a lesson
 */
export const updateUserLessonProgress = async ({
  userId,
  lessonId,
  progress,
  position = 0,
  status = 'in_progress'
}: {
  userId: string;
  lessonId: string;
  progress: number;
  position?: number;
  status?: string;
}) => {
  const supabase = createServerSupabaseClient();
  
  // Determine if the lesson is completed
  const isCompleted = progress >= 100;
  const completedAt = isCompleted ? new Date().toISOString() : null;
  const lessonStatus = isCompleted ? 'completed' : status;
  
  const { data, error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      progress_percentage: progress,
      last_position: position,
      status: lessonStatus,
      completed_at: completedAt,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' })
    .select();
    
  if (error) {
    console.error('Error updating lesson progress:', error);
    throw error;
  }
  
  return data?.[0] || null;
};

/**
 * Record time spent on a lesson
 */
export const recordTimeSpent = async ({
  userId,
  lessonId,
  durationSeconds
}: {
  userId: string;
  lessonId: string;
  durationSeconds: number;
}) => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_time_spent')
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      duration_seconds: durationSeconds,
      last_activity: new Date().toISOString()
    })
    .select();
    
  if (error) {
    console.error('Error recording time spent:', error);
    throw error;
  }
  
  return data?.[0] || null;
};
