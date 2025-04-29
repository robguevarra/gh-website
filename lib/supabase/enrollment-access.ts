/**
 * Enrollment System Data Access Layer
 * 
 * This module provides comprehensive data access functions for the student enrollment system,
 * including enrollment verification, progress tracking, and course access management.
 * 
 * These functions follow our functional, declarative programming paradigm and
 * provide proper error handling and type safety.
 */

import { createServerSupabaseClient } from './client';
import type { Database } from '@/types/supabase';

// Types for our return values
export type UserEnrollment = Database['public']['Tables']['enrollments']['Row'];
export type UserProgress = Database['public']['Tables']['user_progress']['Row'];
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type CourseWithModules = Database['public']['Tables']['courses']['Row'] & {
  modules: (Database['public']['Tables']['modules']['Row'] & {
    lessons: Database['public']['Tables']['lessons']['Row'][]
  })[]
}

/**
 * Get user profile data
 */
export async function getUserProfile(userId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return { data, error };
}

/**
 * Get enrollments for a specific user
 */
export async function getUserEnrollmentsWithCourses(userId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      course: courses (
        *,
        modules (
          *,
          lessons (*)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');
  
  if (error) throw error;
  return data;
}

/**
 * Verify if a user is enrolled in a specific course
 */
export async function verifyUserCourseEnrollment(userId: string, courseId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, status, expires_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return { enrolled: false, enrollment: null };
    }
    throw error;
  }
  
  // Check if enrollment is expired
  const isExpired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
  
  return {
    enrolled: !isExpired,
    enrollment: data
  };
}

/**
 * Get detailed course progress for a user across all enrolled courses
 */
export async function getUserCourseProgress(userId: string) {
  const supabase = createServerSupabaseClient();
  
  // Get all enrollments for the user
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .eq('status', 'active');
  
  if (enrollmentsError) throw enrollmentsError;
  
  if (!enrollments || enrollments.length === 0) {
    return [];
  }
  
  const courseIds = enrollments.map(e => e.course_id);
  
  // Get structure of all enrolled courses (course -> modules -> lessons)
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select(`
      id, title, slug,
      modules (
        id, title, position,
        lessons (
          id, title, position
        )
      )
    `)
    .in('id', courseIds)
    .order('title');
  
  if (coursesError) throw coursesError;
  
  // Flatten to get all lesson IDs
  const lessonIds = courses?.flatMap(course => 
    course.modules?.flatMap(module => 
      module.lessons?.map(lesson => lesson.id)
    ) || []
  ) || [];
  
  // Get progress for all lessons
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);
  
  if (progressError) throw progressError;
  
  // Map progress to courses
  return courses?.map(course => {
    // Calculate total lessons in course
    const totalLessons = course.modules?.reduce(
      (sum, module) => sum + (module.lessons?.length || 0),
      0
    ) || 0;
    
    // Count completed lessons
    const completedLessons = progress?.filter(p => {
      // Find which course this lesson belongs to
      const moduleLesson = course.modules?.find(m => 
        m.lessons?.some(l => l.id === p.lesson_id)
      );
      return moduleLesson && p.status === 'completed';
    }).length || 0;
    
    // Calculate module progress
    const moduleProgress = course.modules?.map(module => {
      const moduleLessonIds = module.lessons?.map(l => l.id) || [];
      
      const moduleProgressData = progress?.filter(p => 
        moduleLessonIds.includes(p.lesson_id)
      ) || [];
      
      const completedModuleLessons = moduleProgressData.filter(p => 
        p.status === 'completed'
      ).length;
      
      return {
        moduleId: module.id,
        title: module.title,
        position: module.position,
        totalLessons: module.lessons?.length || 0,
        completedLessons: completedModuleLessons,
        percentComplete: module.lessons?.length 
          ? (completedModuleLessons / module.lessons.length) * 100 
          : 0,
        lessonsProgress: module.lessons?.map(lesson => {
          const lessonProgress = progress?.find(p => p.lesson_id === lesson.id);
          return {
            lessonId: lesson.id,
            title: lesson.title,
            position: lesson.position,
            status: lessonProgress?.status || 'not_started',
            percentComplete: lessonProgress?.progress_percentage || 0,
            lastPosition: lessonProgress?.last_position || 0
          };
        }).sort((a, b) => a.position - b.position) || []
      };
    }).sort((a, b) => a.position - b.position) || [];
    
    return {
      courseId: course.id,
      title: course.title,
      slug: course.slug,
      totalLessons,
      completedLessons,
      percentComplete: totalLessons ? (completedLessons / totalLessons) * 100 : 0,
      moduleProgress
    };
  }) || [];
}

/**
 * Update a user's progress for a specific lesson
 */
export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  progressData: Partial<{
    status: string;
    progress_percentage: number;
    last_position: number;
    completed_at: string | null;
  }>
) {
  const supabase = createServerSupabaseClient();
  
  // Check if progress record exists
  const { data: existingProgress, error: checkError } = await supabase
    .from('user_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  
  if (checkError) throw checkError;
  
  // Set completed_at timestamp if status is 'completed' and no timestamp provided
  if (progressData.status === 'completed' && !progressData.completed_at) {
    progressData.completed_at = new Date().toISOString();
  }
  
  if (existingProgress) {
    // Update existing progress
    const { data, error } = await supabase
      .from('user_progress')
      .update({
        ...progressData,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingProgress.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Create new progress record
    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        status: progressData.status || 'in_progress',
        progress_percentage: progressData.progress_percentage || 0,
        last_position: progressData.last_position || 0,
        completed_at: progressData.completed_at
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

/**
 * Get the most recent lesson a user was working on across all courses
 * This helps with "continue learning" functionality
 */
export async function getContinueLearningLesson(userId: string) {
  const supabase = createServerSupabaseClient();
  
  // Get the most recently updated progress entry
  const { data: recentProgress, error: progressError } = await supabase
    .from('user_progress')
    .select(`
      *,
      lesson:lessons (
        *,
        module:modules (
          *,
          course:courses (*)
        )
      )
    `)
    .eq('user_id', userId)
    .not('status', 'eq', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (progressError) {
    if (progressError.code === 'PGRST116') { // No rows returned
      return null;
    }
    throw progressError;
  }
  
  return recentProgress;
}

/**
 * Get all templates a user has access to based on enrollments
 */
export async function getUserAccessibleTemplates(userId: string) {
  const supabase = createServerSupabaseClient();
  
  // Get all active enrollments 
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .eq('status', 'active');
  
  if (enrollmentsError) throw enrollmentsError;
  
  if (!enrollments || enrollments.length === 0) {
    return [];
  }
  
  const courseIds = enrollments.map(e => e.course_id);
  
  // Get templates associated with these courses
  // Note: This assumes we have a course_templates join table
  // You may need to adjust this based on your actual schema
  const { data: templates, error: templatesError } = await supabase
    .from('templates')
    .select(`
      *,
      course_templates!inner (course_id)
    `)
    .in('course_templates.course_id', courseIds);
  
  if (templatesError) throw templatesError;
  
  // Remove the join table data from the results
  return templates?.map(template => {
    const { course_templates, ...templateData } = template;
    return templateData;
  }) || [];
}
