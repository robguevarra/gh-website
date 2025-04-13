'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing dashboard UI state
 * 
 * This hook manages UI-specific state for the dashboard, such as
 * active tabs, expanded sections, and modal visibility. It provides
 * memoized handlers for updating the state.
 * 
 * @returns An object containing UI state and handlers
 * 
 * @example
 * ```tsx
 * const { 
 *   activeTab, 
 *   expandedSections, 
 *   isFilterOpen, 
 *   setActiveTab, 
 *   toggleSection, 
 *   toggleFilter 
 * } = useDashboardUI();
 * ```
 */
export function useDashboardUI() {
  // Active tab state
  const [activeTab, setActiveTab] = useState<string>('courses');
  
  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    courses: true,
    templates: false,
    liveClasses: false,
    resources: false
  });
  
  // Filter visibility state
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  
  // Modal visibility states
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  
  // Memoized handlers
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);
  
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);
  
  const toggleFilter = useCallback(() => {
    setIsFilterOpen(prev => !prev);
  }, []);
  
  const toggleWelcomeModal = useCallback(() => {
    setIsWelcomeModalOpen(prev => !prev);
  }, []);
  
  const toggleOnboarding = useCallback(() => {
    setIsOnboardingOpen(prev => !prev);
  }, []);
  
  // Return memoized object
  return useMemo(() => ({
    // State
    activeTab,
    expandedSections,
    isFilterOpen,
    isWelcomeModalOpen,
    isOnboardingOpen,
    
    // Handlers
    setActiveTab: handleTabChange,
    toggleSection,
    toggleFilter,
    toggleWelcomeModal,
    toggleOnboarding,
    
    // Convenience getters
    isSectionExpanded: (sectionId: string) => expandedSections[sectionId] || false
  }), [
    activeTab,
    expandedSections,
    isFilterOpen,
    isWelcomeModalOpen,
    isOnboardingOpen,
    handleTabChange,
    toggleSection,
    toggleFilter,
    toggleWelcomeModal,
    toggleOnboarding
  ]);
}
