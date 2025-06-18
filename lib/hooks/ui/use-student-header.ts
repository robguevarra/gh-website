'use client';

import { useCallback, useMemo } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { useCourseProgress } from '@/lib/hooks/state/use-course-progress';
import { useUserProfile } from '@/lib/hooks/state/use-user-profile';

/**
 * Custom hook for the student header component
 *
 * This hook provides access to the data needed by the student header component,
 * including course progress and continue learning lesson information.
 *
 * @returns An object containing the data and actions needed by the student header
 *
 * @example
 * ```tsx
 * const {
 *   courseProgress,
 *   isLoadingProgress,
 *   continueLearningLesson,
 *   loadUserData
 * } = useStudentHeader();
 * ```
 */
export function useStudentHeader() {
  const { userId } = useUserProfile();

  const enrollments = useStudentDashboardStore(state => state.enrollments);
  
  const {
    courseProgress,
    isLoadingProgress,
    continueLearningLesson,
    loadUserProgress,
    loadContinueLearningLesson
  } = useCourseProgress();

  const loadUserDashboardData = useStudentDashboardStore(state => state.loadUserDashboardData);

  const loadUserData = useCallback((userId: string) => {
    if (userId) {
      console.log(`[useStudentHeader] Data should already be loaded by dashboard - skipping redundant call`);
      // Note: loadUserDashboardData is called by the dashboard page, not here
      // This prevents redundant calls and infinite loops
    }
  }, []);

  return useMemo(() => ({
    courseProgress,
    isLoadingProgress,
    continueLearningLesson,
    loadUserData,
    enrollments,

    hasCourseProgress: Object.keys(courseProgress).length > 0,
    hasContinueLearningLesson: !!continueLearningLesson,

    loadUserProgress: (userId: string) => loadUserProgress(userId),
    loadContinueLearningLesson: (userId: string) => loadContinueLearningLesson(userId)
  }), [
    courseProgress,
    isLoadingProgress,
    continueLearningLesson,
    loadUserData,
    loadUserProgress,
    loadContinueLearningLesson,
    enrollments
  ]);
}
