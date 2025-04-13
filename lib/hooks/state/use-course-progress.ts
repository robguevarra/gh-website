'use client';

import { useCallback, useMemo } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import type { UICourseProgress, UIModuleProgress, UILessonProgress } from '@/lib/stores/student-dashboard/types';

/**
 * Custom hook for accessing course progress state
 * 
 * This hook provides access to course progress data stored in the student dashboard store.
 * It uses individual selectors for each piece of state to prevent unnecessary re-renders
 * and memoizes action functions to ensure stable references.
 * 
 * @returns An object containing course progress state and actions
 * 
 * @example
 * ```tsx
 * const { 
 *   courseProgress, 
 *   moduleProgress, 
 *   lessonProgress, 
 *   updateLessonProgress 
 * } = useCourseProgress();
 * ```
 */

// Define selectors outside the hook to ensure they're stable
const courseProgressSelector = (state: any) => state.courseProgress;
const moduleProgressSelector = (state: any) => state.moduleProgress;
const lessonProgressSelector = (state: any) => state.lessonProgress;
const isLoadingProgressSelector = (state: any) => state.isLoadingProgress;
const hasProgressErrorSelector = (state: any) => state.hasProgressError;
const continueLearningLessonSelector = (state: any) => state.continueLearningLesson;

// Action selectors
const setCourseProgressSelector = (state: any) => state.setCourseProgress;
const setModuleProgressSelector = (state: any) => state.setModuleProgress;
const setLessonProgressSelector = (state: any) => state.setLessonProgress;
const setIsLoadingProgressSelector = (state: any) => state.setIsLoadingProgress;
const setHasProgressErrorSelector = (state: any) => state.setHasProgressError;
const loadUserProgressSelector = (state: any) => state.loadUserProgress;
const updateLessonProgressSelector = (state: any) => state.updateLessonProgress;
const loadContinueLearningLessonSelector = (state: any) => state.loadContinueLearningLesson;

export function useCourseProgress() {
  // Use individual selectors for each piece of state
  const courseProgress = useStudentDashboardStore(courseProgressSelector);
  const moduleProgress = useStudentDashboardStore(moduleProgressSelector);
  const lessonProgress = useStudentDashboardStore(lessonProgressSelector);
  const isLoadingProgress = useStudentDashboardStore(isLoadingProgressSelector);
  const hasProgressError = useStudentDashboardStore(hasProgressErrorSelector);
  const continueLearningLesson = useStudentDashboardStore(continueLearningLessonSelector);
  
  // Get actions separately as they don't need to trigger re-renders
  const setCourseProgress = useStudentDashboardStore(setCourseProgressSelector);
  const setModuleProgress = useStudentDashboardStore(setModuleProgressSelector);
  const setLessonProgress = useStudentDashboardStore(setLessonProgressSelector);
  const setIsLoadingProgress = useStudentDashboardStore(setIsLoadingProgressSelector);
  const setHasProgressError = useStudentDashboardStore(setHasProgressErrorSelector);
  const loadUserProgress = useStudentDashboardStore(loadUserProgressSelector);
  const updateLessonProgress = useStudentDashboardStore(updateLessonProgressSelector);
  const loadContinueLearningLesson = useStudentDashboardStore(loadContinueLearningLessonSelector);
  
  // Memoize action functions to prevent recreation on each render
  const memoizedSetCourseProgress = useCallback((courseId: string, progress: UICourseProgress) => {
    setCourseProgress(courseId, progress);
  }, [setCourseProgress]);
  
  const memoizedSetModuleProgress = useCallback((courseId: string, progress: UIModuleProgress[]) => {
    setModuleProgress(courseId, progress);
  }, [setModuleProgress]);
  
  const memoizedSetLessonProgress = useCallback((lessonId: string, progress: UILessonProgress) => {
    setLessonProgress(lessonId, progress);
  }, [setLessonProgress]);
  
  const memoizedUpdateLessonProgress = useCallback((
    userId: string, 
    lessonId: string, 
    progressData: {
      status?: string;
      progress?: number;
      lastPosition?: number;
    }
  ) => {
    return updateLessonProgress(userId, lessonId, progressData);
  }, [updateLessonProgress]);
  
  const memoizedLoadUserProgress = useCallback((userId: string) => {
    return loadUserProgress(userId);
  }, [loadUserProgress]);
  
  const memoizedLoadContinueLearningLesson = useCallback((userId: string) => {
    return loadContinueLearningLesson(userId);
  }, [loadContinueLearningLesson]);
  
  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    courseProgress,
    moduleProgress,
    lessonProgress,
    isLoadingProgress,
    hasProgressError,
    continueLearningLesson,
    setCourseProgress: memoizedSetCourseProgress,
    setModuleProgress: memoizedSetModuleProgress,
    setLessonProgress: memoizedSetLessonProgress,
    setIsLoadingProgress,
    setHasProgressError,
    loadUserProgress: memoizedLoadUserProgress,
    updateLessonProgress: memoizedUpdateLessonProgress,
    loadContinueLearningLesson: memoizedLoadContinueLearningLesson,
    
    // Convenience getters
    hasCourseProgress: Object.keys(courseProgress).length > 0,
    hasLessonProgress: Object.keys(lessonProgress).length > 0,
    getCourseProgressById: (courseId: string) => courseProgress[courseId] || null,
    getModuleProgressById: (courseId: string) => moduleProgress[courseId] || [],
    getLessonProgressById: (lessonId: string) => lessonProgress[lessonId] || null
  }), [
    courseProgress,
    moduleProgress,
    lessonProgress,
    isLoadingProgress,
    hasProgressError,
    continueLearningLesson,
    memoizedSetCourseProgress,
    memoizedSetModuleProgress,
    memoizedSetLessonProgress,
    setIsLoadingProgress,
    setHasProgressError,
    memoizedLoadUserProgress,
    memoizedUpdateLessonProgress,
    memoizedLoadContinueLearningLesson
  ]);
}
