'use client';

import { useEffect, useMemo } from 'react';
import { useCourseProgress } from '@/lib/hooks/state/use-course-progress';
import { useFetchCourseProgress } from '@/lib/hooks/data/use-fetch-course-progress';
import { useUserProfile } from '@/lib/hooks/state/use-user-profile';

/**
 * Combined hook for accessing and fetching course progress data
 * 
 * This hook combines state access and data fetching for course progress.
 * It automatically fetches the progress data if a userId is provided or
 * uses the current authenticated user, and updates the store with the
 * fetched data.
 * 
 * @param options - Configuration options
 * @param options.userId - The ID of the user to fetch progress for (optional)
 * @param options.courseId - The ID of the course to fetch progress for (optional)
 * @param options.autoFetch - Whether to automatically fetch the data (default: true)
 * @returns An object containing course progress state, loading state, error state, and actions
 * 
 * @example
 * ```tsx
 * // With specific user ID and course ID
 * const { 
 *   courseProgress, 
 *   moduleProgress, 
 *   lessonProgress, 
 *   isLoading, 
 *   error, 
 *   refresh 
 * } = useCourseProgressWithData({ 
 *   userId: '123',
 *   courseId: '456'
 * });
 * 
 * // With current authenticated user
 * const { 
 *   courseProgress, 
 *   moduleProgress, 
 *   lessonProgress, 
 *   isLoading, 
 *   error, 
 *   refresh 
 * } = useCourseProgressWithData();
 * ```
 */
export function useCourseProgressWithData(options?: {
  userId?: string | null;
  courseId?: string | null;
  autoFetch?: boolean;
}) {
  const { userId: storeUserId } = useUserProfile();
  const { 
    courseProgress: storeCourseProgress, 
    moduleProgress: storeModuleProgress,
    lessonProgress: storeLessonProgress,
    isLoadingProgress,
    hasProgressError,
    setCourseProgress,
    setModuleProgress,
    setLessonProgress,
    setIsLoadingProgress,
    setHasProgressError,
    updateLessonProgress: storeUpdateLessonProgress
  } = useCourseProgress();
  
  const { 
    courseProgress: fetchedCourseProgress, 
    moduleProgress: fetchedModuleProgress,
    lessonProgress: fetchedLessonProgress,
    isLoading, 
    error, 
    fetchCourseProgress,
    updateLessonProgress: fetchUpdateLessonProgress
  } = useFetchCourseProgress(
    options?.userId || storeUserId,
    options?.courseId
  );
  
  // Auto-fetch progress data if autoFetch is true (default)
  useEffect(() => {
    const autoFetch = options?.autoFetch !== false;
    const effectiveUserId = options?.userId || storeUserId;
    
    if (autoFetch && effectiveUserId) {
      fetchCourseProgress();
    }
  }, [options?.userId, storeUserId, options?.courseId, fetchCourseProgress, options?.autoFetch]);
  
  // Update the store when data is fetched
  useEffect(() => {
    if (Object.keys(fetchedCourseProgress).length > 0) {
      // Update course progress for each course
      Object.entries(fetchedCourseProgress).forEach(([courseId, progress]) => {
        setCourseProgress(courseId, progress);
      });
    }
  }, [fetchedCourseProgress, setCourseProgress]);
  
  // Update module progress in the store
  useEffect(() => {
    if (Object.keys(fetchedModuleProgress).length > 0) {
      // Update module progress for each course
      Object.entries(fetchedModuleProgress).forEach(([courseId, progress]) => {
        setModuleProgress(courseId, progress);
      });
    }
  }, [fetchedModuleProgress, setModuleProgress]);
  
  // Update lesson progress in the store
  useEffect(() => {
    if (Object.keys(fetchedLessonProgress).length > 0) {
      // Update lesson progress for each lesson
      Object.entries(fetchedLessonProgress).forEach(([lessonId, progress]) => {
        setLessonProgress(lessonId, progress);
      });
    }
  }, [fetchedLessonProgress, setLessonProgress]);
  
  // Update loading state
  useEffect(() => {
    setIsLoadingProgress(isLoading);
  }, [isLoading, setIsLoadingProgress]);
  
  // Update error state
  useEffect(() => {
    setHasProgressError(!!error);
  }, [error, setHasProgressError]);
  
  // Combined update lesson progress function
  const updateLessonProgress = async (
    userId: string,
    lessonId: string,
    progressData: {
      status?: string;
      progress?: number;
      lastPosition?: number;
    }
  ) => {
    // Update in the store
    await storeUpdateLessonProgress(userId, lessonId, progressData);
    
    // Update in the database
    return fetchUpdateLessonProgress(userId, lessonId, progressData);
  };
  
  // Refresh function to manually trigger a data fetch
  const refresh = async () => {
    return fetchCourseProgress();
  };
  
  return useMemo(() => ({
    // Use store data if available, otherwise use fetched data
    courseProgress: Object.keys(storeCourseProgress).length > 0 
      ? storeCourseProgress 
      : fetchedCourseProgress,
    
    moduleProgress: Object.keys(storeModuleProgress).length > 0 
      ? storeModuleProgress 
      : fetchedModuleProgress,
    
    lessonProgress: Object.keys(storeLessonProgress).length > 0 
      ? storeLessonProgress 
      : fetchedLessonProgress,
    
    isLoading: isLoadingProgress || isLoading,
    error,
    refresh,
    updateLessonProgress,
    
    // Convenience getters
    hasCourseProgress: Object.keys(storeCourseProgress).length > 0 || Object.keys(fetchedCourseProgress).length > 0,
    hasLessonProgress: Object.keys(storeLessonProgress).length > 0 || Object.keys(fetchedLessonProgress).length > 0,
    
    getCourseProgressById: (courseId: string) => 
      storeCourseProgress[courseId] || fetchedCourseProgress[courseId] || null,
    
    getModuleProgressById: (courseId: string) => 
      storeModuleProgress[courseId] || fetchedModuleProgress[courseId] || [],
    
    getLessonProgressById: (lessonId: string) => 
      storeLessonProgress[lessonId] || fetchedLessonProgress[lessonId] || null
  }), [
    storeCourseProgress,
    storeModuleProgress,
    storeLessonProgress,
    fetchedCourseProgress,
    fetchedModuleProgress,
    fetchedLessonProgress,
    isLoadingProgress,
    isLoading,
    error,
    refresh,
    updateLessonProgress
  ]);
}
