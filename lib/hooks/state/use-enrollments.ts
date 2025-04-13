'use client';

import { useCallback, useMemo } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import type { UserEnrollment } from '@/lib/stores/student-dashboard/types';

/**
 * Custom hook for accessing enrollment state
 * 
 * This hook provides access to enrollment data stored in the student dashboard store.
 * It uses individual selectors for each piece of state to prevent unnecessary re-renders
 * and memoizes action functions to ensure stable references.
 * 
 * @returns An object containing enrollment state and actions
 * 
 * @example
 * ```tsx
 * const { 
 *   enrollments, 
 *   isLoadingEnrollments, 
 *   hasEnrollmentError, 
 *   setEnrollments 
 * } = useEnrollments();
 * ```
 */

// Define selectors outside the hook to ensure they're stable
const enrollmentsSelector = (state: any) => state.enrollments;
const isLoadingEnrollmentsSelector = (state: any) => state.isLoadingEnrollments;
const hasEnrollmentErrorSelector = (state: any) => state.hasEnrollmentError;
const setEnrollmentsSelector = (state: any) => state.setEnrollments;
const setIsLoadingEnrollmentsSelector = (state: any) => state.setIsLoadingEnrollments;
const setHasEnrollmentErrorSelector = (state: any) => state.setHasEnrollmentError;
const loadUserEnrollmentsSelector = (state: any) => state.loadUserEnrollments;

export function useEnrollments() {
  // Use individual selectors for each piece of state
  const enrollments = useStudentDashboardStore(enrollmentsSelector);
  const isLoadingEnrollments = useStudentDashboardStore(isLoadingEnrollmentsSelector);
  const hasEnrollmentError = useStudentDashboardStore(hasEnrollmentErrorSelector);
  
  // Get actions separately as they don't need to trigger re-renders
  const setEnrollments = useStudentDashboardStore(setEnrollmentsSelector);
  const setIsLoadingEnrollments = useStudentDashboardStore(setIsLoadingEnrollmentsSelector);
  const setHasEnrollmentError = useStudentDashboardStore(setHasEnrollmentErrorSelector);
  const loadUserEnrollments = useStudentDashboardStore(loadUserEnrollmentsSelector);
  
  // Memoize action functions to prevent recreation on each render
  const memoizedSetEnrollments = useCallback((enrollments: UserEnrollment[]) => {
    setEnrollments(enrollments);
  }, [setEnrollments]);
  
  const memoizedSetIsLoading = useCallback((isLoading: boolean) => {
    setIsLoadingEnrollments(isLoading);
  }, [setIsLoadingEnrollments]);
  
  const memoizedSetHasError = useCallback((hasError: boolean) => {
    setHasEnrollmentError(hasError);
  }, [setHasEnrollmentError]);
  
  const memoizedLoadEnrollments = useCallback((userId: string) => {
    return loadUserEnrollments(userId);
  }, [loadUserEnrollments]);
  
  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    enrollments,
    isLoadingEnrollments,
    hasEnrollmentError,
    setEnrollments: memoizedSetEnrollments,
    setIsLoadingEnrollments: memoizedSetIsLoading,
    setHasEnrollmentError: memoizedSetHasError,
    loadUserEnrollments: memoizedLoadEnrollments,
    
    // Convenience getters
    hasEnrollments: enrollments.length > 0,
    enrollmentCount: enrollments.length
  }), [
    enrollments,
    isLoadingEnrollments,
    hasEnrollmentError,
    memoizedSetEnrollments,
    memoizedSetIsLoading,
    memoizedSetHasError,
    memoizedLoadEnrollments
  ]);
}
