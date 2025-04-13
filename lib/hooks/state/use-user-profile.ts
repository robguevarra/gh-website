'use client';

import { useCallback, useMemo } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import type { UserProfile } from '@/types/user';

/**
 * Custom hook for accessing user profile state
 * 
 * This hook provides access to user profile data stored in the student dashboard store.
 * It uses individual selectors for each piece of state to prevent unnecessary re-renders
 * and memoizes action functions to ensure stable references.
 * 
 * @returns An object containing user profile state and actions
 * 
 * @example
 * ```tsx
 * const { userId, userProfile, isLoadingProfile, setUserId } = useUserProfile();
 * ```
 */

// Define selectors outside the hook to ensure they're stable
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

  const memoizedSetUserProfile = useCallback((profile: UserProfile | null) => {
    setUserProfile(profile);
  }, [setUserProfile]);

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    userId,
    userProfile,
    isLoadingProfile,
    setUserId: memoizedSetUserId,
    setUserProfile: memoizedSetUserProfile
  }), [
    userId,
    userProfile,
    isLoadingProfile,
    memoizedSetUserId,
    memoizedSetUserProfile
  ]);
}
