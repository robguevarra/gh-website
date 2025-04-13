/**
 * Optimized hook for enrollment data
 * 
 * This hook centralizes enrollment data loading and provides a consistent
 * interface for components to access enrollment data.
 */

import { useCallback, useMemo } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { getBrowserClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { useBatchUpdates } from '../utils/use-batch-updates';

// Selectors for better performance
const enrollmentsSelector = (state: any) => state.enrollments;
const isLoadingEnrollmentsSelector = (state: any) => state.isLoadingEnrollments;
const hasEnrollmentErrorSelector = (state: any) => state.hasEnrollmentError;
const lastEnrollmentsLoadTimeSelector = (state: any) => state.lastEnrollmentsLoadTime;

/**
 * Hook for centralized enrollment data loading and access
 * 
 * @param options Configuration options
 * @param options.userId User ID to load enrollments for (optional, uses authenticated user if not provided)
 * @param options.includeExpired Whether to include expired enrollments (default: false)
 * @param options.autoFetch Whether to automatically fetch data on mount (default: true)
 * @returns Enrollment data and loading state
 */
export function useEnrollmentData({
  userId,
  includeExpired = false,
  autoFetch = true
}: {
  userId?: string | null;
  includeExpired?: boolean;
  autoFetch?: boolean;
} = {}) {
  const batchUpdates = useBatchUpdates();
  
  // Get state from store using individual selectors
  const enrollments = useStudentDashboardStore(enrollmentsSelector);
  const isLoading = useStudentDashboardStore(isLoadingEnrollmentsSelector);
  const hasError = useStudentDashboardStore(hasEnrollmentErrorSelector);
  const lastLoadTime = useStudentDashboardStore(lastEnrollmentsLoadTimeSelector);
  
  // Get store actions using getState to avoid re-renders
  const getStore = useCallback(() => useStudentDashboardStore.getState(), []);
  
  /**
   * Load enrollment data with debouncing and caching
   */
  const loadEnrollments = useCallback(async (effectiveUserId: string) => {
    if (!effectiveUserId) return null;
    
    const store = getStore();
    const now = Date.now();
    
    // Check if we're already loading
    if (store.isLoadingEnrollments) {
      return store.enrollments;
    }
    
    // Check if we've loaded recently (within the last 10 seconds)
    if (store.lastEnrollmentsLoadTime && now - store.lastEnrollmentsLoadTime < 10000) {
      return store.enrollments;
    }
    
    // Set loading state
    batchUpdates(() => {
      store.setIsLoadingEnrollments(true);
      store.loadUserEnrollments(effectiveUserId);
    });
    
    return store.enrollments;
  }, [getStore, batchUpdates]);
  
  // Fetch data using SWR for caching and revalidation
  const { data, error, mutate } = useSWR(
    userId && autoFetch ? ['enrollments', userId, includeExpired] : null,
    () => loadEnrollments(userId as string),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // 10 seconds
      focusThrottleInterval: 10000, // 10 seconds
    }
  );
  
  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    // Data
    enrollments: data || enrollments,
    isLoading,
    hasError: hasError || !!error,
    lastLoadTime,
    
    // Actions
    refresh: () => mutate(),
    loadEnrollments,
    
    // Derived data
    hasEnrollments: (data || enrollments)?.length > 0,
    enrollmentCount: (data || enrollments)?.length || 0,
  }), [
    data,
    enrollments,
    isLoading,
    hasError,
    error,
    lastLoadTime,
    mutate,
    loadEnrollments
  ]);
}
