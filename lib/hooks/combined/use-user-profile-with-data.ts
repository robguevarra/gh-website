'use client';

import { useEffect, useMemo } from 'react';
import { useUserProfile } from '@/lib/hooks/state/use-user-profile';
import { useFetchUserProfile } from '@/lib/hooks/data/use-fetch-user-profile';

/**
 * Combined hook for accessing and fetching user profile data
 * 
 * This hook combines state access and data fetching for user profiles.
 * It automatically fetches the profile data if a userId is provided or
 * uses the current authenticated user, and updates the store with the
 * fetched data.
 * 
 * @param options - Configuration options
 * @param options.userId - The ID of the user to fetch (optional)
 * @param options.autoFetch - Whether to automatically fetch the data (default: true)
 * @returns An object containing user profile state, loading state, error state, and actions
 * 
 * @example
 * ```tsx
 * // With specific user ID
 * const { userProfile, isLoading, error, refresh } = useUserProfileWithData({ userId: '123' });
 * 
 * // With current authenticated user
 * const { userProfile, isLoading, error, refresh } = useUserProfileWithData();
 * ```
 */
export function useUserProfileWithData(options?: {
  userId?: string | null;
  autoFetch?: boolean;
}) {
  const { userId: storeUserId, userProfile, setUserId, setUserProfile } = useUserProfile();
  const { data, isLoading, error, fetchProfile, fetchCurrentUserProfile } = useFetchUserProfile(options?.userId);

  // Determine which userId to use
  const effectiveUserId = options?.userId || storeUserId;
  
  // Auto-fetch profile data if autoFetch is true (default)
  useEffect(() => {
    const autoFetch = options?.autoFetch !== false;
    
    if (autoFetch) {
      if (effectiveUserId) {
        fetchProfile();
      } else {
        // If no userId is provided, fetch the current user's profile
        fetchCurrentUserProfile().then(result => {
          if (result) {
            setUserId(result.userId);
          }
        });
      }
    }
  }, [effectiveUserId, fetchProfile, fetchCurrentUserProfile, setUserId, options?.autoFetch]);

  // Update the store when data is fetched
  useEffect(() => {
    if (data) {
      setUserProfile(data);
    }
  }, [data, setUserProfile]);

  // Refresh function to manually trigger a data fetch
  const refresh = async () => {
    if (effectiveUserId) {
      return fetchProfile();
    } else {
      return fetchCurrentUserProfile();
    }
  };

  return useMemo(() => ({
    userId: effectiveUserId,
    userProfile: userProfile || data, // Use store data or fetched data
    isLoading,
    error,
    refresh,
    setUserId,
    setUserProfile
  }), [
    effectiveUserId,
    userProfile,
    data,
    isLoading,
    error,
    refresh,
    setUserId,
    setUserProfile
  ]);
}
