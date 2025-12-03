'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { useEnrollments } from '@/lib/hooks/state/use-enrollments';
import { useFetchEnrollments } from '@/lib/hooks/data/use-fetch-enrollments';
import { useUserProfile } from '@/lib/hooks/state/use-user-profile';

/**
 * Combined hook for accessing and fetching enrollment data
 * 
 * This hook combines state access and data fetching for user enrollments.
 * It automatically fetches the enrollment data if a userId is provided or
 * uses the current authenticated user, and updates the store with the
 * fetched data.
 * 
 * @param options - Configuration options
 * @param options.userId - The ID of the user to fetch enrollments for (optional)
 * @param options.includeExpired - Whether to include expired enrollments (default: false)
 * @param options.autoFetch - Whether to automatically fetch the data (default: true)
 * @returns An object containing enrollment state, loading state, error state, and actions
 * 
 * @example
 * ```tsx
 * // With specific user ID
 * const { enrollments, isLoading, error, refresh } = useEnrollmentsWithData({ 
 *   userId: '123',
 *   includeExpired: true
 * });
 * 
 * // With current authenticated user
 * const { enrollments, isLoading, error, refresh } = useEnrollmentsWithData();
 * ```
 */
export function useEnrollmentsWithData(options?: {
  userId?: string | null;
  includeExpired?: boolean;
  autoFetch?: boolean;
}) {
  const { userId: storeUserId } = useUserProfile();
  const {
    enrollments,
    isLoadingEnrollments,
    hasEnrollmentError,
    setEnrollments,
    setIsLoadingEnrollments,
    setHasEnrollmentError
  } = useEnrollments();

  const {
    data,
    isLoading,
    error,
    fetchEnrollments
  } = useFetchEnrollments(
    options?.userId || storeUserId,
    { includeExpired: options?.includeExpired }
  );

  // Auto-fetch enrollment data if autoFetch is true (default)
  useEffect(() => {
    const autoFetch = options?.autoFetch !== false;
    const effectiveUserId = options?.userId || storeUserId;

    if (autoFetch && effectiveUserId) {
      fetchEnrollments();
    }
  }, [options?.userId, storeUserId, fetchEnrollments, options?.autoFetch]);

  // Update the store when data is fetched
  useEffect(() => {
    if (data && data.length > 0) {
      setEnrollments(data);
    }
  }, [data, setEnrollments]);

  // Update loading state
  useEffect(() => {
    setIsLoadingEnrollments(isLoading);
  }, [isLoading, setIsLoadingEnrollments]);

  // Update error state
  useEffect(() => {
    setHasEnrollmentError(!!error);
  }, [error, setHasEnrollmentError]);

  // Refresh function to manually trigger a data fetch
  const refresh = useCallback(async () => {
    return fetchEnrollments();
  }, [fetchEnrollments]);

  return useMemo(() => ({
    enrollments: enrollments.length > 0 ? enrollments : data,
    isLoading: isLoadingEnrollments || isLoading,
    error,
    refresh,
    hasEnrollments: (enrollments.length > 0 || data.length > 0),
    enrollmentCount: enrollments.length || data.length
  }), [
    enrollments,
    data,
    isLoadingEnrollments,
    isLoading,
    error,
    refresh
  ]);
}
