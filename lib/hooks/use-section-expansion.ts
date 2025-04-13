'use client';

import { useCallback } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';

/**
 * Custom hook for managing section expansion state in the dashboard
 * This hook optimizes re-renders by using direct store selectors
 *
 * Industry Best Practices:
 * 1. Use individual selectors for each piece of state
 * 2. Select only the minimal state needed by the component
 * 3. Use stable selector functions defined outside the component
 * 4. Avoid creating new objects in selector functions
 */

// Define selectors outside the component to ensure they're stable
const expandedSectionSelector = (state: any) => state.expandedSection;
const toggleSectionSelector = (state: any) => state.toggleSection;

export function useSectionExpansion() {
  // Use individual selectors for each piece of state
  // This prevents re-renders when other parts of the store change
  const expandedSection = useStudentDashboardStore(expandedSectionSelector);

  // Get the toggle function directly from the store
  const toggleSectionFromStore = useStudentDashboardStore(toggleSectionSelector);

  // Memoize the isSectionExpanded function to prevent recreation on each render
  const isSectionExpanded = useCallback((section: string): boolean => {
    return expandedSection === section;
  }, [expandedSection]);

  // Memoize the toggleSection function to prevent recreation on each render
  const toggleSection = useCallback((section: string): void => {
    toggleSectionFromStore(section);
  }, [toggleSectionFromStore]);

  // Return the values directly - no need for useMemo here since we're not creating a new object
  // on each render that would cause unnecessary re-renders
  return {
    isSectionExpanded,
    toggleSection
  };
}
