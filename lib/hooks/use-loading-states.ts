'use client';

import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';

/**
 * Custom hook for accessing loading states with optimized performance
 *
 * Industry Best Practices:
 * 1. Use individual selectors for each piece of state
 * 2. Select only the minimal state needed by the component
 * 3. Use stable selector functions defined outside the component
 * 4. Avoid creating new objects in selector functions
 */

// Define selectors outside the component to ensure they're stable
const isLoadingEnrollmentsSelector = (state: any) => state.isLoadingEnrollments;
const isLoadingProgressSelector = (state: any) => state.isLoadingProgress;
const loadUserEnrollmentsSelector = (state: any) => state.loadUserEnrollments;
const loadUserProgressSelector = (state: any) => state.loadUserProgress;

export function useLoadingStates() {
  // Use individual selectors for each piece of state
  // This prevents re-renders when other parts of the store change
  const isLoadingEnrollments = useStudentDashboardStore(isLoadingEnrollmentsSelector);
  const isLoadingProgress = useStudentDashboardStore(isLoadingProgressSelector);

  // Get action functions directly from the store
  const loadUserEnrollments = useStudentDashboardStore(loadUserEnrollmentsSelector);
  const loadUserProgress = useStudentDashboardStore(loadUserProgressSelector);

  // Return the values directly - no need for useMemo here since we're not creating a new object
  // on each render that would cause unnecessary re-renders
  return {
    isLoadingEnrollments,
    isLoadingProgress,
    loadUserEnrollments,
    loadUserProgress
  };
}
