'use client';

import { useCallback, useMemo } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { useBatchUpdates } from '@/lib/hooks/utils/use-batch-updates';

/**
 * Custom hook for dashboard UI state
 * 
 * This hook provides access to UI-specific state for the dashboard,
 * such as welcome modal visibility, onboarding state, and expanded sections.
 * 
 * @returns An object containing UI state and actions
 * 
 * @example
 * ```tsx
 * const { 
 *   showWelcomeModal, 
 *   showOnboarding, 
 *   expandedSections, 
 *   toggleSection 
 * } = useDashboardState();
 * ```
 */

// Define selectors outside the hook to ensure they're stable
const showWelcomeModalSelector = (state: any) => state.showWelcomeModal;
const showOnboardingSelector = (state: any) => state.showOnboarding;
const showAnnouncementSelector = (state: any) => state.showAnnouncement;
const expandedSectionsSelector = (state: any) => state.expandedSections;

// Action selectors
const setShowWelcomeModalSelector = (state: any) => state.setShowWelcomeModal;
const setShowOnboardingSelector = (state: any) => state.setShowOnboarding;
const setShowAnnouncementSelector = (state: any) => state.setShowAnnouncement;
const toggleSectionSelector = (state: any) => state.toggleSection;

export function useDashboardState() {
  const batchUpdates = useBatchUpdates();
  
  // Use individual selectors for each piece of state
  const showWelcomeModal = useStudentDashboardStore(showWelcomeModalSelector);
  const showOnboarding = useStudentDashboardStore(showOnboardingSelector);
  const showAnnouncement = useStudentDashboardStore(showAnnouncementSelector);
  const expandedSections = useStudentDashboardStore(expandedSectionsSelector);
  
  // Get actions separately as they don't need to trigger re-renders
  const setShowWelcomeModal = useStudentDashboardStore(setShowWelcomeModalSelector);
  const setShowOnboarding = useStudentDashboardStore(setShowOnboardingSelector);
  const setShowAnnouncement = useStudentDashboardStore(setShowAnnouncementSelector);
  const toggleSection = useStudentDashboardStore(toggleSectionSelector);
  
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
  
  const memoizedToggleSection = useCallback((section: string) => {
    toggleSection(section);
  }, [toggleSection]);
  
  // Batch multiple UI state updates
  const updateUIState = useCallback((updates: {
    showWelcomeModal?: boolean;
    showOnboarding?: boolean;
    showAnnouncement?: boolean;
  }) => {
    batchUpdates(() => {
      if (updates.showWelcomeModal !== undefined) {
        setShowWelcomeModal(updates.showWelcomeModal);
      }
      if (updates.showOnboarding !== undefined) {
        setShowOnboarding(updates.showOnboarding);
      }
      if (updates.showAnnouncement !== undefined) {
        setShowAnnouncement(updates.showAnnouncement);
      }
    });
  }, [batchUpdates, setShowWelcomeModal, setShowOnboarding, setShowAnnouncement]);
  
  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    showWelcomeModal,
    showOnboarding,
    showAnnouncement,
    expandedSections,
    setShowWelcomeModal: memoizedSetShowWelcomeModal,
    setShowOnboarding: memoizedSetShowOnboarding,
    setShowAnnouncement: memoizedSetShowAnnouncement,
    toggleSection: memoizedToggleSection,
    updateUIState,
    
    // Convenience getters
    isSectionExpanded: (section: string) => expandedSections[section] || false,
    hasExpandedSections: Object.values(expandedSections).some(Boolean)
  }), [
    showWelcomeModal,
    showOnboarding,
    showAnnouncement,
    expandedSections,
    memoizedSetShowWelcomeModal,
    memoizedSetShowOnboarding,
    memoizedSetShowAnnouncement,
    memoizedToggleSection,
    updateUIState
  ]);
}
