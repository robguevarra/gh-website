/**
 * Custom hooks for accessing specific slices of the student dashboard store
 * These hooks use selectors to prevent unnecessary re-renders
 *
 * State Management Patterns:
 * 1. Selector Functions - Use selector functions to access only the state needed
 * 2. State Isolation - Each hook accesses only the state it needs
 * 3. Performance Monitoring - Development-mode tracking to identify bottlenecks
 * 4. Equality Checking - Uses shallow equality checking for state comparison
 */

import { useEffect, useRef, useCallback, useMemo } from 'react'

// Import the student dashboard store
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard'

/**
 * Enhanced performance monitoring function that logs renders in development
 * with detailed information about the component and render cause
 */
const logRender = (hookName: string): void => {
  if (process.env.NODE_ENV === 'development') {
    // Use a ref to track render count across renders
    const renderCount = useRef(0)
    renderCount.current++

    // Get the component stack trace to identify which component is using this hook
    const stackTrace = new Error().stack || ''
    const callerComponent = stackTrace.split('\n')
      .slice(2, 3) // Get the caller component from the stack trace
      .map(line => line.trim())
      .join('')

    // Log render count on each render with component info
    console.log(`[Performance] ${hookName} rendered (count: ${renderCount.current}) in ${callerComponent}`)

    // Track previous state to detect changes
    const prevStateRef = useRef<any>(null)

    // Get current state
    const currentState = useStudentDashboardStore.getState()

    // Compare with previous state if available
    if (prevStateRef.current) {
      const changedKeys = Object.keys(currentState as Record<string, any>).filter(key => {
        // Skip functions
        if (typeof (currentState as Record<string, any>)[key] === 'function') return false
        return JSON.stringify((currentState as Record<string, any>)[key]) !== JSON.stringify((prevStateRef.current as Record<string, any>)[key])
      })

      if (changedKeys.length > 0) {
        console.log(`[Performance] State changes detected in: ${changedKeys.join(', ')}`)
      }
    }

    // Update previous state reference
    prevStateRef.current = { ...currentState }

    // Log warning if components render too many times
    if (renderCount.current > 5) {
      console.warn(`[WARNING] ${hookName} has rendered ${renderCount.current} times. This may indicate a performance issue.`)
      console.warn(`[WARNING] Component: ${callerComponent}`)
    }

    // Use effect for cleanup only
    useEffect(() => {
      // Return cleanup function to help with debugging
      return () => {
        console.log(`[Performance] ${hookName} unmounted after ${renderCount.current} renders`)
      }
    }, []) // Empty dependency array to ensure this only runs once
  }
}

// We don't need to define these types as they're inferred from the selectors

/**
 * Hook for user profile data
 */
export const useUserProfileData = () => {
  // Monitor hook performance in development
  logRender('useUserProfileData')

  // Get state values using individual selectors
  const userId = useStudentDashboardStore(state => state.userId)
  const userProfile = useStudentDashboardStore(state => state.userProfile)
  const isLoadingProfile = useStudentDashboardStore(state => state.isLoadingProfile)

  // Get actions separately as they don't need to trigger re-renders
  const setUserId = useStudentDashboardStore(state => state.setUserId)
  const setUserProfile = useStudentDashboardStore(state => state.setUserProfile)

  // Use useMemo to return a stable object reference and prevent unnecessary re-renders
  return useMemo(() => ({
    userId,
    userProfile,
    isLoadingProfile,
    setUserId,
    setUserProfile
  }), [userId, userProfile, isLoadingProfile, setUserId, setUserProfile])
}

// We don't need to define these types as they're inferred from the selectors

/**
 * Hook for user enrollments data and actions
 */
export function useEnrollmentsData() {
  // Monitor hook performance in development
  logRender('useEnrollmentsData')

  // Get state values using individual selectors
  const enrollments = useStudentDashboardStore(state => state.enrollments)
  const isLoadingEnrollments = useStudentDashboardStore(state => state.isLoadingEnrollments)
  const hasEnrollmentError = useStudentDashboardStore(state => state.hasEnrollmentError)

  // Get actions separately as they don't need to trigger re-renders
  const setEnrollments = useStudentDashboardStore(state => state.setEnrollments)
  const loadUserEnrollments = useStudentDashboardStore(state => state.loadUserEnrollments)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    enrollments,
    isLoadingEnrollments,
    hasEnrollmentError,
    setEnrollments,
    loadUserEnrollments
  }), [enrollments, isLoadingEnrollments, hasEnrollmentError, setEnrollments, loadUserEnrollments])
}

/**
 * Hook for templates data and actions
 */
export function useTemplatesData() {
  // Monitor hook performance in development
  logRender('useTemplatesData')

  // Get state values using individual selectors
  const templates = useStudentDashboardStore(state => state.templates)
  const selectedTemplateId = useStudentDashboardStore(state => state.selectedTemplateId)
  const templateFilter = useStudentDashboardStore(state => state.templateFilter)
  const templateSearchQuery = useStudentDashboardStore(state => state.templateSearchQuery)
  const isLoadingTemplates = useStudentDashboardStore(state => state.isLoadingTemplates)
  const hasTemplatesError = useStudentDashboardStore(state => state.hasTemplatesError)

  // Get actions separately as they don't need to trigger re-renders
  const setTemplates = useStudentDashboardStore(state => state.setTemplates)
  const setSelectedTemplateId = useStudentDashboardStore(state => state.setSelectedTemplateId)
  const setTemplateFilter = useStudentDashboardStore(state => state.setTemplateFilter)
  const setTemplateSearchQuery = useStudentDashboardStore(state => state.setTemplateSearchQuery)
  const setIsLoadingTemplates = useStudentDashboardStore(state => state.setIsLoadingTemplates)
  const setHasTemplatesError = useStudentDashboardStore(state => state.setHasTemplatesError)
  const getFilteredTemplates = useStudentDashboardStore(state => state.getFilteredTemplates)
  const loadUserTemplates = useStudentDashboardStore(state => state.loadUserTemplates)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    templates,
    selectedTemplateId,
    templateFilter,
    templateSearchQuery,
    isLoadingTemplates,
    hasTemplatesError,
    setTemplates,
    setSelectedTemplateId,
    setTemplateFilter,
    setTemplateSearchQuery,
    setIsLoadingTemplates,
    setHasTemplatesError,
    getFilteredTemplates,
    loadUserTemplates
  }), [
    templates,
    selectedTemplateId,
    templateFilter,
    templateSearchQuery,
    isLoadingTemplates,
    hasTemplatesError,
    setTemplates,
    setSelectedTemplateId,
    setTemplateFilter,
    setTemplateSearchQuery,
    setIsLoadingTemplates,
    setHasTemplatesError,
    getFilteredTemplates,
    loadUserTemplates
  ])
}

// We don't need to define these types as they're inferred from the selectors

/**
 * Hook for course progress data
 */
export function useCourseProgressData() {
  // Monitor hook performance in development
  logRender('useCourseProgressData')

  // Get state values using individual selectors
  const courseProgress = useStudentDashboardStore(state => state.courseProgress)
  const moduleProgress = useStudentDashboardStore(state => state.moduleProgress)
  const lessonProgress = useStudentDashboardStore(state => state.lessonProgress)
  const isLoadingProgress = useStudentDashboardStore(state => state.isLoadingProgress)
  const hasProgressError = useStudentDashboardStore(state => state.hasProgressError)
  const continueLearningLesson = useStudentDashboardStore(state => state.continueLearningLesson)

  // Get actions separately as they don't need to trigger re-renders
  const setCourseProgress = useStudentDashboardStore(state => state.setCourseProgress)
  const setModuleProgress = useStudentDashboardStore(state => state.setModuleProgress)
  const setLessonProgress = useStudentDashboardStore(state => state.setLessonProgress)
  const setIsLoadingProgress = useStudentDashboardStore(state => state.setIsLoadingProgress)
  const setHasProgressError = useStudentDashboardStore(state => state.setHasProgressError)
  const loadUserProgress = useStudentDashboardStore(state => state.loadUserProgress)
  const updateLessonProgress = useStudentDashboardStore(state => state.updateLessonProgress)
  const loadContinueLearningLesson = useStudentDashboardStore(state => state.loadContinueLearningLesson)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    courseProgress,
    moduleProgress,
    lessonProgress,
    isLoadingProgress,
    hasProgressError,
    continueLearningLesson,
    setCourseProgress,
    setModuleProgress,
    setLessonProgress,
    setIsLoadingProgress,
    setHasProgressError,
    loadUserProgress,
    updateLessonProgress,
    loadContinueLearningLesson
  }), [
    courseProgress,
    moduleProgress,
    lessonProgress,
    isLoadingProgress,
    hasProgressError,
    continueLearningLesson,
    setCourseProgress,
    setModuleProgress,
    setLessonProgress,
    setIsLoadingProgress,
    setHasProgressError,
    loadUserProgress,
    updateLessonProgress,
    loadContinueLearningLesson
  ])
}

/**
 * Hook for purchases data
 */
export function usePurchasesData() {
  // Monitor hook performance in development
  logRender('usePurchasesData')

  // Get state values using individual selectors
  const purchases = useStudentDashboardStore(state => state.purchases)
  const isLoadingPurchases = useStudentDashboardStore(state => state.isLoadingPurchases)
  const hasPurchasesError = useStudentDashboardStore(state => state.hasPurchasesError)

  // Get actions separately as they don't need to trigger re-renders
  const setPurchases = useStudentDashboardStore(state => state.setPurchases)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    purchases,
    isLoadingPurchases,
    hasPurchasesError,
    setPurchases
  }), [purchases, isLoadingPurchases, hasPurchasesError, setPurchases])
}

// We don't need to define these types as they're inferred from the selectors

/**
 * Hook for live classes data
 *
 * Uses the same pattern as other hooks in this file for consistency
 * and to prevent unnecessary re-renders
 */
export const useLiveClassesData = () => {
  // Monitor hook performance in development
  logRender('useLiveClassesData')

  // Get state values using individual selectors
  const liveClasses = useStudentDashboardStore(state => state.liveClasses)
  const isLoadingLiveClasses = useStudentDashboardStore(state => state.isLoadingLiveClasses)
  const hasLiveClassesError = useStudentDashboardStore(state => state.hasLiveClassesError)

  // Get actions separately as they don't need to trigger re-renders
  const setLiveClasses = useStudentDashboardStore(state => state.setLiveClasses)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    liveClasses,
    isLoadingLiveClasses,
    hasLiveClassesError,
    setLiveClasses
  }), [liveClasses, isLoadingLiveClasses, hasLiveClassesError, setLiveClasses])
}

// We don't need to define these types as they're inferred from the selectors

/**
 * Hook for UI state
 */
export const useUIState = () => {
  // Monitor hook performance in development
  logRender('useUIState')

  // Get state values using individual selectors
  const showWelcomeModal = useStudentDashboardStore(state => state.showWelcomeModal)
  const showOnboarding = useStudentDashboardStore(state => state.showOnboarding)
  const showAnnouncement = useStudentDashboardStore(state => state.showAnnouncement)
  const expandedSection = useStudentDashboardStore(state => state.expandedSection)

  // Get actions separately as they don't need to trigger re-renders
  const setShowWelcomeModal = useStudentDashboardStore(state => state.setShowWelcomeModal)
  const setShowOnboarding = useStudentDashboardStore(state => state.setShowOnboarding)
  const setShowAnnouncement = useStudentDashboardStore(state => state.setShowAnnouncement)
  const toggleSection = useStudentDashboardStore(state => state.toggleSection)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    showWelcomeModal,
    showOnboarding,
    showAnnouncement,
    expandedSection,
    setShowWelcomeModal,
    setShowOnboarding,
    setShowAnnouncement,
    toggleSection
  }), [
    showWelcomeModal,
    showOnboarding,
    showAnnouncement,
    expandedSection,
    setShowWelcomeModal,
    setShowOnboarding,
    setShowAnnouncement,
    toggleSection
  ])
}

// We don't need to define these types as they're inferred from the selectors

/**
 * Hook for optimized section expansion state
 * This is a minimal hook that only accesses the expandedSection state
 * to prevent unnecessary re-renders of components that only need to know
 * if a specific section is expanded
 */
export const useSectionExpansion = () => {
  // Monitor hook performance in development
  logRender('useSectionExpansion')

  // Get section state directly from the store
  const expandedSection = useStudentDashboardStore(state => state.expandedSection)

  // Get actions separately
  const toggleSection = useStudentDashboardStore(state => state.toggleSection)

  // Memoize the derived function to prevent recreating it on every render
  const isSectionExpanded = useCallback(
    (section: string) => expandedSection === section,
    [expandedSection]
  )

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    isSectionExpanded,
    toggleSection
  }), [isSectionExpanded, toggleSection])
}
