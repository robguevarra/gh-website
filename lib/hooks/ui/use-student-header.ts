'use client';

import { useCallback, useMemo } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { useCourseProgress } from '@/lib/hooks/state/use-course-progress';
import { useUserProfile } from '@/lib/hooks/state/use-user-profile';
import { useBatchUpdates } from '@/lib/hooks/utils/use-batch-updates';
import { useEnrollmentData } from '@/lib/hooks/optimized/use-enrollment-data';

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
  const batchUpdates = useBatchUpdates();
  const { userId } = useUserProfile();

  // Use optimized hooks for better performance
  const { loadEnrollments, enrollments } = useEnrollmentData({ autoFetch: false });
  const {
    courseProgress,
    isLoadingProgress,
    continueLearningLesson,
    loadUserProgress,
    loadContinueLearningLesson
  } = useCourseProgress();

  // Initialize dashboard data when user is authenticated
  // Using optimized hooks for better performance
  const loadUserData = useCallback((userId: string) => {
    if (userId) {
      // Check if we've loaded recently (within the last 10 seconds)
      const state = useStudentDashboardStore.getState();
      const now = Date.now();

      // Only load if we haven't loaded recently
      if (!state.lastContinueLearningLessonLoadTime ||
          now - state.lastContinueLearningLessonLoadTime > 10000) {
        batchUpdates(() => {
          // Load enrollments using our optimized hook
          loadEnrollments(userId);

          // Load progress data
          loadUserProgress(userId);
        });
      }
    }
  }, [batchUpdates, loadEnrollments, loadUserProgress]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    courseProgress,
    isLoadingProgress,
    continueLearningLesson,
    loadUserData,
    enrollments,

    // Convenience getters
    hasCourseProgress: Object.keys(courseProgress).length > 0,
    hasContinueLearningLesson: !!continueLearningLesson,

    // Individual loaders for more granular control
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
