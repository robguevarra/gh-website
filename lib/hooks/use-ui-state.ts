'use client';

import { useCallback } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';

/**
 * Custom hook for accessing UI state with optimized performance
 *
 * Industry Best Practices:
 * 1. Use individual selectors for each piece of state
 * 2. Select only the minimal state needed by the component
 * 3. Use stable selector functions defined outside the component
 * 4. Avoid creating new objects in selector functions
 */

// Define selectors outside the component to ensure they're stable
const showWelcomeModalSelector = (state: any) => state.showWelcomeModal;
const showOnboardingSelector = (state: any) => state.showOnboarding;
const showAnnouncementSelector = (state: any) => state.showAnnouncement;
const setShowWelcomeModalSelector = (state: any) => state.setShowWelcomeModal;
const setShowOnboardingSelector = (state: any) => state.setShowOnboarding;
const setShowAnnouncementSelector = (state: any) => state.setShowAnnouncement;

export function useOptimizedUIState() {
  // Use individual selectors for each piece of state
  // This prevents re-renders when other parts of the store change
  const showWelcomeModal = useStudentDashboardStore(showWelcomeModalSelector);
  const showOnboarding = useStudentDashboardStore(showOnboardingSelector);
  const showAnnouncement = useStudentDashboardStore(showAnnouncementSelector);

  // Get actions separately as they don't need to trigger re-renders
  const setShowWelcomeModal = useStudentDashboardStore(setShowWelcomeModalSelector);
  const setShowOnboarding = useStudentDashboardStore(setShowOnboardingSelector);
  const setShowAnnouncement = useStudentDashboardStore(setShowAnnouncementSelector);

  // Memoize action functions to prevent recreation on each render
  const memoizedSetShowWelcomeModal = useCallback((show: boolean) => {
    setShowWelcomeModal(show);
  }, [setShowWelcomeModal]);

  const memoizedSetShowOnboarding = useCallback((show: boolean) => {
    setShowOnboarding(show);
  }, [setShowOnboarding]);

  const memoizedSetShowAnnouncement = useCallback((show: boolean) => {
    setShowAnnouncement(show);
  }, [setShowAnnouncement]);

  // Return the values directly - no need for useMemo here since we're not creating a new object
  // on each render that would cause unnecessary re-renders
  return {
    showWelcomeModal,
    showOnboarding,
    showAnnouncement,
    setShowWelcomeModal: memoizedSetShowWelcomeModal,
    setShowOnboarding: memoizedSetShowOnboarding,
    setShowAnnouncement: memoizedSetShowAnnouncement
  };
}
