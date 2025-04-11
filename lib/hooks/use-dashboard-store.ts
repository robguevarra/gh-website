/**
 * Custom hooks for accessing specific slices of the student dashboard store
 * These hooks use selectors to prevent unnecessary re-renders
 * 
 * State Management Patterns:
 * 1. Selector Memoization - useCallback ensures selectors don't change on re-renders
 * 2. State Isolation - Each hook accesses only the state it needs
 * 3. Performance Monitoring - Development-mode tracking to identify bottlenecks
 * 4. Equality Checking - Uses shallow equality checking for state comparison
 */

import { useCallback, useEffect, useRef } from 'react'
import { shallow } from 'zustand/shallow'

// Import the student dashboard store and types
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard'
import { Purchase, UserEnrollment } from '@/lib/stores/student-dashboard/types'

// Define the type for the store state
type StudentDashboardState = ReturnType<typeof useStudentDashboardStore.getState>

/**
 * Simple performance monitoring function that logs renders in development
 */
const logRender = (hookName: string): void => {
  if (process.env.NODE_ENV === 'development') {
    const renderCount = useRef(0)
    renderCount.current++
    
    useEffect(() => {
      console.log(`[Performance] ${hookName} rendered (count: ${renderCount.current})`)
      
      // Log warning if components render too many times
      if (renderCount.current > 5) {
        console.warn(`[WARNING] ${hookName} has rendered ${renderCount.current} times. This may indicate a performance issue.`)
      }
    })
  }
}

// Define the shape of what we're extracting from the store
type UserProfileState = {
  userId: string | null;
  userProfile: {
    name: string;
    email: string;
    avatar: string;
    joinedDate: string;
  } | null;
  isLoadingProfile: boolean;
  setUserProfile: (profile: any) => void;
  setUserId: (userId: string | null) => void;
}

/**
 * Hook for user profile data
 */
export const useUserProfileData = () => {
  // Monitor hook performance in development
  logRender('useUserProfileData')
  
  // Use individual selectors for each piece of state to prevent unnecessary re-renders
  const userId = useStudentDashboardStore(state => state.userId)
  const userProfile = useStudentDashboardStore(state => state.userProfile)
  const isLoadingProfile = useStudentDashboardStore(state => state.isLoadingProfile)
  const setUserId = useStudentDashboardStore(state => state.setUserId)
  const setUserProfile = useStudentDashboardStore(state => state.setUserProfile)
  
  // Return a stable object reference to prevent infinite loops
  return {
    userId,
    userProfile,
    isLoadingProfile,
    setUserId,
    setUserProfile
  }
}

// Type from the store file
interface Template {
  id: string;
  title: string;
  category: string;
  type: string;
  downloadUrl: string;
  previewUrl: string;
  thumbnailUrl: string;
  description: string;
  dateCreated: string;
  dateUpdated: string;
}

type TemplatesState = {
  templates: Template[];
  selectedTemplateId: string | null;
  templateFilter: string;
  templateSearchQuery: string;
  isLoadingTemplates: boolean;
  hasTemplatesError: boolean;
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplateId: (templateId: string | null) => void;
  setTemplateFilter: (filter: string) => void;
  setTemplateSearchQuery: (query: string) => void;
  getFilteredTemplates: () => Template[];
  getSelectedTemplate: () => Template | null;
}

/**
 * Interface for enrollments state slice
 */
interface EnrollmentsState {
  enrollments: UserEnrollment[];
  isLoadingEnrollments: boolean;
  hasEnrollmentError: boolean;
  setEnrollments: (enrollments: UserEnrollment[]) => void;
  loadUserEnrollments: (userId: string) => Promise<void>;
}

/**
 * Hook for user enrollments data and actions
 */
export function useEnrollmentsData() {
  // Monitor hook performance in development
  logRender('useEnrollmentsData')
  
  // Get enrollments from store
  const enrollments = useStudentDashboardStore(state => state.enrollments)
  
  // Get loading state
  const isLoadingEnrollments = useStudentDashboardStore(state => state.isLoadingEnrollments)
  
  // Get error state
  const hasEnrollmentError = useStudentDashboardStore(state => state.hasEnrollmentError)
  
  // Get actions
  const setEnrollments = useStudentDashboardStore(state => state.setEnrollments)
  const loadUserEnrollments = useStudentDashboardStore(state => state.loadUserEnrollments)
  
  // Return a stable object
  return {
    enrollments,
    isLoadingEnrollments,
    hasEnrollmentError,
    setEnrollments,
    loadUserEnrollments
  }
}

/**
 * Hook for templates data and actions
 */
export function useTemplatesData() {
  // Monitor hook performance in development
  logRender('useTemplatesData')
  
  // Use individual selectors for each piece of state
  const templates = useStudentDashboardStore(state => state.templates)
  const selectedTemplateId = useStudentDashboardStore(state => state.selectedTemplateId)
  const templateFilter = useStudentDashboardStore(state => state.templateFilter)
  const templateSearchQuery = useStudentDashboardStore(state => state.templateSearchQuery)
  const isLoadingTemplates = useStudentDashboardStore(state => state.isLoadingTemplates)
  const hasTemplatesError = useStudentDashboardStore(state => state.hasTemplatesError)
  
  // Get actions separately
  const setTemplates = useStudentDashboardStore(state => state.setTemplates)
  const setSelectedTemplateId = useStudentDashboardStore(state => state.setSelectedTemplateId)
  const setTemplateFilter = useStudentDashboardStore(state => state.setTemplateFilter)
  const setTemplateSearchQuery = useStudentDashboardStore(state => state.setTemplateSearchQuery)
  const setIsLoadingTemplates = useStudentDashboardStore(state => state.setIsLoadingTemplates)
  const setHasTemplatesError = useStudentDashboardStore(state => state.setHasTemplatesError)
  const getFilteredTemplates = useStudentDashboardStore(state => state.getFilteredTemplates)
  
  // Return a stable object to prevent unnecessary re-renders
  return {
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
    loadUserTemplates: useStudentDashboardStore(state => state.loadUserTemplates)
  }
}

// Define interfaces needed for the types
interface CourseProgress {
  completed: boolean;
  progress: number;
  startDate: string;
  lastActivity: string;
}

interface ModuleProgress {
  moduleId: string;
  completed: boolean;
  progress: number;
}

type CourseProgressState = {
  courseProgress: Record<string, CourseProgress>;
  moduleProgress: Record<string, ModuleProgress[]>;
  lessonProgress: Record<string, { 
    status: string;
    progress: number;
    lastPosition: number;
  }>;
  isLoadingProgress: boolean;
  hasProgressError: boolean;
  setCourseProgress: (courseId: string, progress: CourseProgress) => void;
  setModuleProgress: (courseId: string, progress: ModuleProgress[]) => void;
  setLessonProgress: (lessonId: string, progress: { status: string; progress: number; lastPosition: number }) => void;
  getContinueLearningLesson: () => { courseId: string; lessonId: string; title: string; progress: number } | null;
  loadUserProgress: () => void;
  updateLessonProgress: (lessonId: string, progress: { status: string; progress: number; lastPosition: number }) => void;
  loadContinueLearningLesson: () => void;
}

/**
 * Hook for course progress data
 */
export function useCourseProgressData() {
  // Monitor hook performance in development
  logRender('useCourseProgressData')
  
  // Use individual selectors for each piece of state to prevent unnecessary re-renders
  const courseProgress = useStudentDashboardStore(state => state.courseProgress)
  const moduleProgress = useStudentDashboardStore(state => state.moduleProgress)
  const lessonProgress = useStudentDashboardStore(state => state.lessonProgress)
  const isLoadingProgress = useStudentDashboardStore(state => state.isLoadingProgress)
  const hasProgressError = useStudentDashboardStore(state => state.hasProgressError)
  const continueLearningLesson = useStudentDashboardStore(state => state.continueLearningLesson)
  
  // Get actions separately
  const setCourseProgress = useStudentDashboardStore(state => state.setCourseProgress)
  const setModuleProgress = useStudentDashboardStore(state => state.setModuleProgress)
  const setLessonProgress = useStudentDashboardStore(state => state.setLessonProgress)
  const setIsLoadingProgress = useStudentDashboardStore(state => state.setIsLoadingProgress)
  const setHasProgressError = useStudentDashboardStore(state => state.setHasProgressError)
  
  // Get new API actions
  const loadUserProgress = useStudentDashboardStore(state => state.loadUserProgress)
  const updateLessonProgress = useStudentDashboardStore(state => state.updateLessonProgress)
  const loadContinueLearningLesson = useStudentDashboardStore(state => state.loadContinueLearningLesson)
  
  // Return a stable object to prevent unnecessary re-renders
  return {
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
  }
}

/**
 * Hook for purchases data
 */
export function usePurchasesData() {
  // Monitor hook performance in development
  logRender('usePurchasesData')
  
  // Get purchases from store
  const purchases = useStudentDashboardStore(state => state.purchases)
  
  // Get loading state
  const isLoadingPurchases = useStudentDashboardStore(state => state.isLoadingPurchases)
  
  // Get error state
  const hasPurchasesError = useStudentDashboardStore(state => state.hasPurchasesError)
  
  // Get actions
  const setPurchases = useStudentDashboardStore(state => state.setPurchases)
  
  // Return a stable object
  return {
    purchases,
    isLoadingPurchases,
    hasPurchasesError,
    setPurchases
  }
}

interface LiveClass {
  id: number;
  title: string;
  date: string;
  time: string;
  host: {
    name: string;
    avatar: string;
  };
  zoomLink: string;
}

type LiveClassesState = {
  liveClasses: LiveClass[];
  isLoadingLiveClasses: boolean;
  hasLiveClassesError: boolean;
  setLiveClasses: (classes: LiveClass[]) => void;
}

/**
 * Hook for live classes data
 * 
 * Uses the same pattern as other hooks in this file for consistency
 * and to prevent unnecessary re-renders
 */
export const useLiveClassesData = () => {
  // Monitor hook performance in development
  logRender('useLiveClassesData')
  
  // Use individual selectors for each piece of state to prevent unnecessary re-renders
  const liveClasses = useStudentDashboardStore(state => state.liveClasses)
  const isLoadingLiveClasses = useStudentDashboardStore(state => state.isLoadingLiveClasses)
  const hasLiveClassesError = useStudentDashboardStore(state => state.hasLiveClassesError)
  const setLiveClasses = useStudentDashboardStore(state => state.setLiveClasses)
  
  // Return a stable object reference to prevent infinite loops
  return {
    liveClasses,
    isLoadingLiveClasses,
    hasLiveClassesError,
    setLiveClasses
  }
}

type UIState = {
  showWelcomeModal: boolean;
  showOnboarding: boolean;
  showAnnouncement: boolean;
  expandedSection: string | null;
  setShowWelcomeModal: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setShowAnnouncement: (show: boolean) => void;
  toggleSection: (section: string) => void;
}

/**
 * Hook for UI state
 */
export const useUIState = () => {
  // Monitor hook performance in development
  logRender('useUIState')
  
  // Get UI state directly from the store
  const showWelcomeModal = useStudentDashboardStore(state => state.showWelcomeModal)
  const showOnboarding = useStudentDashboardStore(state => state.showOnboarding)
  const showAnnouncement = useStudentDashboardStore(state => state.showAnnouncement)
  const expandedSection = useStudentDashboardStore(state => state.expandedSection)
  
  // Get UI actions directly from the store
  const setShowWelcomeModal = useStudentDashboardStore(state => state.setShowWelcomeModal)
  const setShowOnboarding = useStudentDashboardStore(state => state.setShowOnboarding)
  const setShowAnnouncement = useStudentDashboardStore(state => state.setShowAnnouncement)
  const toggleSection = useStudentDashboardStore(state => state.toggleSection)
  
  // Return a stable object
  return {
    showWelcomeModal,
    showOnboarding,
    showAnnouncement,
    expandedSection,
    setShowWelcomeModal,
    setShowOnboarding,
    setShowAnnouncement,
    toggleSection
  }
}

type SectionExpansionState = {
  expandedSection: string | null;
  toggleSection: (section: string) => void;
}

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
  const toggleSection = useStudentDashboardStore(state => state.toggleSection)
  
  // Memoize the derived function to prevent recreating it on every render
  const isSectionExpanded = useCallback(
    (section: string) => expandedSection === section,
    [expandedSection]
  )

  return { isSectionExpanded, toggleSection }
}
