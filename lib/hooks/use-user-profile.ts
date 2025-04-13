'use client';

import { useCallback } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';

/**
 * Custom hook for accessing user profile data with optimized performance
 *
 * Industry Best Practices:
 * 1. Use individual selectors for each piece of state
 * 2. Select only the minimal state needed by the component
 * 3. Use stable selector functions defined outside the component
 * 4. Avoid creating new objects in selector functions
 */

// Define selectors outside the component to ensure they're stable
const userIdSelector = (state: any) => state.userId;
const userProfileSelector = (state: any) => state.userProfile;
const isLoadingProfileSelector = (state: any) => state.isLoadingProfile;
const setUserIdSelector = (state: any) => state.setUserId;
const setUserProfileSelector = (state: any) => state.setUserProfile;

export function useUserProfile() {
  // Use individual selectors for each piece of state
  // This prevents re-renders when other parts of the store change
  const userId = useStudentDashboardStore(userIdSelector);
  const userProfile = useStudentDashboardStore(userProfileSelector);
  const isLoadingProfile = useStudentDashboardStore(isLoadingProfileSelector);

  // Get actions separately as they don't need to trigger re-renders
  const setUserId = useStudentDashboardStore(setUserIdSelector);
  const setUserProfile = useStudentDashboardStore(setUserProfileSelector);

  // Memoize action functions to prevent recreation on each render
  const memoizedSetUserId = useCallback((userId: string | null) => {
    setUserId(userId);
  }, [setUserId]);

  const memoizedSetUserProfile = useCallback((profile: any) => {
    setUserProfile(profile);
  }, [setUserProfile]);

  // Return the values directly - no need for useMemo here since we're not creating a new object
  // on each render that would cause unnecessary re-renders
  return {
    userId,
    userProfile,
    isLoadingProfile,
    setUserId: memoizedSetUserId,
    setUserProfile: memoizedSetUserProfile
  };
}
