'use client';

import { useCallback, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { UICourseProgress, UIModuleProgress, UILessonProgress } from '@/lib/stores/student-dashboard/types';

/**
 * Custom hook for fetching course progress data from Supabase
 * 
 * This hook handles fetching course progress data from the database.
 * It manages loading and error states and provides methods for
 * fetching and refreshing the data.
 * 
 * @param userId - The ID of the user to fetch progress for (optional)
 * @param courseId - The ID of the course to fetch progress for (optional)
 * @returns An object containing the fetched data, loading state, error state, and refresh function
 * 
 * @example
 * ```tsx
 * const { 
 *   courseProgress, 
 *   moduleProgress, 
 *   lessonProgress, 
 *   isLoading, 
 *   error, 
 *   refresh 
 * } = useFetchCourseProgress(userId, courseId);
 * ```
 */
export function useFetchCourseProgress(
  userId?: string | null,
  courseId?: string | null
) {
  const supabase = getBrowserClient();
  const [courseProgress, setCourseProgress] = useState<Record<string, UICourseProgress>>({});
  const [moduleProgress, setModuleProgress] = useState<Record<string, UIModuleProgress[]>>({});
  const [lessonProgress, setLessonProgress] = useState<Record<string, UILessonProgress>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch course progress data from Supabase
   */
  const fetchCourseProgress = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build the query for course progress
      let query = supabase
        .from('course_progress')
        .select(`
          id,
          course_id,
          user_id,
          progress,
          status,
          last_accessed,
          completed_at
        `)
        .eq('user_id', userId);
      
      // Add filter for specific course if provided
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      
      // Execute the query
      const { data: progressData, error: progressError } = await query;

      if (progressError) {
        throw new Error(progressError.message);
      }

      // Map the data to the expected format
      const mappedCourseProgress: Record<string, UICourseProgress> = {};
      
      progressData.forEach((progress: any) => {
        mappedCourseProgress[progress.course_id] = {
          id: progress.id,
          courseId: progress.course_id,
          userId: progress.user_id,
          progress: progress.progress,
          status: progress.status,
          lastAccessed: progress.last_accessed,
          completedAt: progress.completed_at
        };
      });

      setCourseProgress(mappedCourseProgress);
      
      // Fetch module progress if we have course progress
      if (progressData.length > 0) {
        await fetchModuleProgress(userId, courseId);
        await fetchLessonProgress(userId, courseId);
      }
      
      return {
        courseProgress: mappedCourseProgress,
        moduleProgress,
        lessonProgress
      };
    } catch (err) {
      console.error('Error fetching course progress:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch course progress'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId, courseId]);

  /**
   * Fetch module progress data from Supabase
   */
  const fetchModuleProgress = useCallback(async (
    userId: string,
    courseId?: string | null
  ) => {
    try {
      // Build the query for module progress
      let query = supabase
        .from('module_progress')
        .select(`
          id,
          module_id,
          course_id,
          user_id,
          progress,
          status,
          last_accessed,
          completed_at
        `)
        .eq('user_id', userId);
      
      // Add filter for specific course if provided
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      
      // Execute the query
      const { data: progressData, error: progressError } = await query;

      if (progressError) {
        throw new Error(progressError.message);
      }

      // Map the data to the expected format
      const mappedModuleProgress: Record<string, UIModuleProgress[]> = {};
      
      progressData.forEach((progress: any) => {
        if (!mappedModuleProgress[progress.course_id]) {
          mappedModuleProgress[progress.course_id] = [];
        }
        
        mappedModuleProgress[progress.course_id].push({
          id: progress.id,
          moduleId: progress.module_id,
          courseId: progress.course_id,
          userId: progress.user_id,
          progress: progress.progress,
          status: progress.status,
          lastAccessed: progress.last_accessed,
          completedAt: progress.completed_at
        });
      });

      setModuleProgress(mappedModuleProgress);
      return mappedModuleProgress;
    } catch (err) {
      console.error('Error fetching module progress:', err);
      return {};
    }
  }, [supabase]);

  /**
   * Fetch lesson progress data from Supabase
   */
  const fetchLessonProgress = useCallback(async (
    userId: string,
    courseId?: string | null
  ) => {
    try {
      // Build the query for lesson progress
      let query = supabase
        .from('lesson_progress')
        .select(`
          id,
          lesson_id,
          module_id,
          course_id,
          user_id,
          progress,
          status,
          last_position,
          last_accessed,
          completed_at
        `)
        .eq('user_id', userId);
      
      // Add filter for specific course if provided
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      
      // Execute the query
      const { data: progressData, error: progressError } = await query;

      if (progressError) {
        throw new Error(progressError.message);
      }

      // Map the data to the expected format
      const mappedLessonProgress: Record<string, UILessonProgress> = {};
      
      progressData.forEach((progress: any) => {
        mappedLessonProgress[progress.lesson_id] = {
          id: progress.id,
          lessonId: progress.lesson_id,
          moduleId: progress.module_id,
          courseId: progress.course_id,
          userId: progress.user_id,
          progress: progress.progress,
          status: progress.status,
          lastPosition: progress.last_position,
          lastAccessed: progress.last_accessed,
          completedAt: progress.completed_at
        };
      });

      setLessonProgress(mappedLessonProgress);
      return mappedLessonProgress;
    } catch (err) {
      console.error('Error fetching lesson progress:', err);
      return {};
    }
  }, [supabase]);

  /**
   * Update lesson progress in Supabase
   */
  const updateLessonProgress = useCallback(async (
    userId: string,
    lessonId: string,
    progressData: {
      status?: string;
      progress?: number;
      lastPosition?: number;
    }
  ) => {
    try {
      // Check if lesson progress exists
      const { data: existingProgress, error: checkError } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();
      
      const now = new Date().toISOString();
      
      if (checkError || !existingProgress) {
        // Create new progress record
        const { data, error } = await supabase
          .from('lesson_progress')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            status: progressData.status || 'in-progress',
            progress: progressData.progress || 0,
            last_position: progressData.lastPosition || 0,
            last_accessed: now,
            completed_at: progressData.status === 'completed' ? now : null
          })
          .select()
          .single();
          
        if (error) throw error;
        
        // Update local state
        setLessonProgress(prev => ({
          ...prev,
          [lessonId]: {
            ...data,
            lessonId: data.lesson_id,
            moduleId: data.module_id,
            courseId: data.course_id,
            userId: data.user_id
          }
        }));
        
        return data;
      } else {
        // Update existing progress record
        const updateData: any = {
          last_accessed: now
        };
        
        if (progressData.status) updateData.status = progressData.status;
        if (progressData.progress !== undefined) updateData.progress = progressData.progress;
        if (progressData.lastPosition !== undefined) updateData.last_position = progressData.lastPosition;
        if (progressData.status === 'completed') updateData.completed_at = now;
        
        const { data, error } = await supabase
          .from('lesson_progress')
          .update(updateData)
          .eq('id', existingProgress.id)
          .select()
          .single();
          
        if (error) throw error;
        
        // Update local state
        setLessonProgress(prev => ({
          ...prev,
          [lessonId]: {
            ...prev[lessonId],
            ...data,
            lessonId: data.lesson_id,
            moduleId: data.module_id,
            courseId: data.course_id,
            userId: data.user_id
          }
        }));
        
        return data;
      }
    } catch (err) {
      console.error('Error updating lesson progress:', err);
      return null;
    }
  }, [supabase]);

  return {
    courseProgress,
    moduleProgress,
    lessonProgress,
    isLoading,
    error,
    fetchCourseProgress,
    updateLessonProgress,
    
    // Convenience getters
    hasCourseProgress: Object.keys(courseProgress).length > 0,
    hasLessonProgress: Object.keys(lessonProgress).length > 0,
    getCourseProgressById: (courseId: string) => courseProgress[courseId] || null,
    getModuleProgressById: (courseId: string) => moduleProgress[courseId] || [],
    getLessonProgressById: (lessonId: string) => lessonProgress[lessonId] || null
  };
}
