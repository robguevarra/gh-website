import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { performanceMiddleware, subscriptionTrackingMiddleware } from './middleware';
import { batchMiddleware } from './batch-middleware';
import { equalityMiddleware } from './equality-middleware';
import { createActions } from './actions';

/**
 * Student Dashboard Store
 *
 * This store manages all state related to the student dashboard experience,
 * including user profile, enrollments, course progress, templates, and UI state.
 *
 * State Management Patterns:
 * 1. State Isolation - Each component only subscribes to the state it needs
 * 2. Performance Optimization - Custom hooks with memoized selectors prevent unnecessary re-renders
 * 3. Persistence - Critical state is persisted in localStorage
 * 4. Performance Monitoring - Development mode includes performance tracking
 */
import {
  type UserEnrollment,
  type UICourseProgress,
  type UIModuleProgress,
  type UILessonProgress,
  type Template,
  type Purchase,
  type LiveClass,
  type ContinueLearningLesson
} from './types/index';

// ADDED: Import or define ProductData type (assuming it's moved or defined globally)
// If not moved, define it here based on app/dashboard/store/page.tsx
export type ProductData = {
  id: string;
  title: string | null;
  handle: string | null;
  featured_image_url: string | null;
  price: number;
  compare_at_price?: number | null;
};

// ADDED: Define StoreCollection type
export type StoreCollection = {
  handle: string;
  // title?: string; // Optional: Add title if fetched later
};

export interface StudentDashboardStore {
  // Dashboard Data Loading Actions
  loadUserDashboardData: (userId: string, force?: boolean) => Promise<void>;
  loadUserEnrollments: (userId: string, force?: boolean) => Promise<void>;
  loadUserProgress: (userId: string, force?: boolean) => Promise<void>;
  loadUserTemplates: (userId: string, force?: boolean) => Promise<void>;
  loadContinueLearningLesson: (userId: string, force?: boolean) => Promise<void>;
  updateLessonProgress: (userId: string, lessonId: string, progressData: {
    status?: string;
    progress?: number;
    lastPosition?: number;
  }) => Promise<void>;

  // Clear user state action
  clearUserState: () => void;

  // User data
  userId: string | null;
  userProfile: {
    name: string;
    email: string;
    avatar: string;
    joinedDate: string;
  } | null;
  isLoadingProfile: boolean;

  // Enrollment data
  enrollments: UserEnrollment[];
  isLoadingEnrollments: boolean;
  hasEnrollmentError: boolean;
  lastEnrollmentsLoadTime: number | null;

  // Progress data
  courseProgress: Record<string, UICourseProgress>;
  moduleProgress: Record<string, UIModuleProgress[]>;
  lessonProgress: Record<string, UILessonProgress>;
  isLoadingProgress: boolean;
  hasProgressError: boolean;
  lastProgressLoadTime: number | null;
  continueLearningLesson: ContinueLearningLesson | null;
  isLoadingContinueLearningLesson: boolean;
  lastContinueLearningLessonLoadTime: number | null;

  // Templates data
  templates: Template[];
  selectedTemplateId: string | null;
  templateFilter: string;
  templateSearchQuery: string;
  isLoadingTemplates: boolean;
  hasTemplatesError: boolean;
  lastTemplatesLoadTime: number | null;

  // Purchases data
  purchases: Purchase[];
  isLoadingPurchases: boolean;
  hasPurchasesError: boolean;

  // Live classes data
  liveClasses: LiveClass[];
  isLoadingLiveClasses: boolean;
  hasLiveClassesError: boolean;

  // UI state
  showWelcomeModal: boolean;
  showOnboarding: boolean;
  showAnnouncement: boolean;
  expandedSections: {
    [key: string]: boolean;
  };
  expandedSection?: string; // For backward compatibility

  // Actions
  initializeAuthenticatedUser: () => Promise<void>;
  setUserId: (userId: string | null) => void;
  setUserProfile: (profile: StudentDashboardStore['userProfile']) => void;

  // Enrollment actions
  setEnrollments: (enrollments: UserEnrollment[]) => void;
  setIsLoadingEnrollments: (isLoading: boolean) => void;
  setHasEnrollmentError: (hasError: boolean) => void;

  // Progress actions
  setCourseProgress: (courseId: string, progress: UICourseProgress) => void;
  setModuleProgress: (courseId: string, progress: UIModuleProgress[]) => void;
  setLessonProgress: (lessonId: string, progress: UILessonProgress) => void;
  setIsLoadingProgress: (isLoading: boolean) => void;
  setHasProgressError: (hasError: boolean) => void;

  // Templates actions
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplateId: (templateId: string | null) => void;
  setTemplateFilter: (filter: string) => void;
  setTemplateSearchQuery: (query: string) => void;
  setIsLoadingTemplates: (isLoading: boolean) => void;
  setHasTemplatesError: (hasError: boolean) => void;

  // Purchases actions
  setPurchases: (purchases: Purchase[]) => void;
  setIsLoadingPurchases: (isLoading: boolean) => void;
  setHasPurchasesError: (hasError: boolean) => void;

  // Live classes actions
  setLiveClasses: (classes: LiveClass[]) => void;
  setIsLoadingLiveClasses: (isLoading: boolean) => void;
  setHasLiveClassesError: (hasError: boolean) => void;

  // UI actions
  setShowWelcomeModal: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setShowAnnouncement: (show: boolean) => void;
  toggleSection: (section: string) => void;

  // Utility functions
  getFilteredTemplates: () => Template[];
  getSelectedTemplate: () => Template | null;
  getContinueLearningLesson: () => { courseId: string; lessonId: string; title: string; progress: number } | null;

  // Performance monitoring (dev only)
  _getSubscriberCount?: () => number;
  _getUpdateFrequency?: () => { [key: string]: number };

  // ADDED: Store data loading actions
  loadStoreProducts: (userId: string, filter?: { query?: string | null; collectionHandle?: string | null }, force?: boolean) => Promise<void>;
  loadStoreCollections: (force?: boolean) => Promise<void>;

  // ADDED: Store data
  storeProducts: ProductData[];
  isLoadingStoreProducts: boolean;
  hasStoreProductsError: boolean;
  lastStoreProductsLoadTime: number | null;

  // ADDED: Collections data
  storeCollections: StoreCollection[];
  isLoadingStoreCollections: boolean;
  hasStoreCollectionsError: boolean;
  lastStoreCollectionsLoadTime: number | null;

  // ADDED: Sale Products data
  saleProducts: ProductData[];
  isLoadingSaleProducts: boolean;
  hasSaleProductsError: boolean;
  lastSaleProductsLoadTime: number | null;
}

export const useStudentDashboardStore = create<StudentDashboardStore>()(
  // Apply performance monitoring middleware in development mode
  subscriptionTrackingMiddleware(
  // performanceMiddleware( // Temporarily commented out
  batchMiddleware(
  // equalityMiddleware( // Temporarily commented out
  persist(
    (set, get) => ({
      // Import actions from the actions module
      ...createActions(set, get),
      // User data
      userId: null,
      userProfile: null,
      isLoadingProfile: false,

      // Enrollment data
      enrollments: [],
      isLoadingEnrollments: false,
      hasEnrollmentError: false,
      lastEnrollmentsLoadTime: null,

      // Progress data
      courseProgress: {},
      moduleProgress: {},
      lessonProgress: {},
      isLoadingProgress: false,
      hasProgressError: false,
      lastProgressLoadTime: null,
      continueLearningLesson: null,
      isLoadingContinueLearningLesson: false,
      lastContinueLearningLessonLoadTime: null,

      // Templates data
      templates: [],
      selectedTemplateId: null,
      templateFilter: '',
      templateSearchQuery: '',
      isLoadingTemplates: false,
      hasTemplatesError: false,
      lastTemplatesLoadTime: null,

      // Purchases data
      purchases: [],
      isLoadingPurchases: false,
      hasPurchasesError: false,

      // Live classes data
      liveClasses: [],
      isLoadingLiveClasses: false,
      hasLiveClassesError: false,

      // UI state
      showWelcomeModal: true,
      showOnboarding: false,
      showAnnouncement: true,
      expandedSections: {
        'progress': true,
        'continue-learning': true,
        'announcements': true,
        'live-classes': true,
        'support': true,
        'templates': true,
        'purchases': true,
        'community': true,
      },
      expandedSection: 'all',

      // Actions
      setUserId: (userId) => set({ userId, isLoadingProfile: false }),
      setUserProfile: (profile) => set({ userProfile: profile, isLoadingProfile: false }),

      // Enrollment actions
      setEnrollments: (enrollments) => set({ enrollments }),
      setIsLoadingEnrollments: (isLoading) => set({ isLoadingEnrollments: isLoading }),
      setHasEnrollmentError: (hasError) => set({ hasEnrollmentError: hasError }),

      // Progress actions
      setCourseProgress: (courseId, progress) =>
        set((state) => ({
          courseProgress: {
            ...state.courseProgress,
            [courseId]: progress
          }
        })),
      setModuleProgress: (courseId, progress) =>
        set((state) => ({
          moduleProgress: {
            ...state.moduleProgress,
            [courseId]: progress
          }
        })),
      setLessonProgress: (lessonId, progress) =>
        set((state) => ({
          lessonProgress: {
            ...state.lessonProgress,
            [lessonId]: progress
          }
        })),
      setIsLoadingProgress: (isLoading) => set({ isLoadingProgress: isLoading }),
      setHasProgressError: (hasError) => set({ hasProgressError: hasError }),

      // Templates actions
      setTemplates: (templates) => set({ templates }),
      setSelectedTemplateId: (templateId) => set({ selectedTemplateId: templateId }),
      setTemplateFilter: (filter) => set({ templateFilter: filter }),
      setTemplateSearchQuery: (query) => set({ templateSearchQuery: query }),
      setIsLoadingTemplates: (isLoading) => set({ isLoadingTemplates: isLoading }),
      setHasTemplatesError: (hasError) => set({ hasTemplatesError: hasError }),

      // Purchases actions
      setPurchases: (purchases) => set({ purchases }),
      setIsLoadingPurchases: (isLoading) => set({ isLoadingPurchases: isLoading }),
      setHasPurchasesError: (hasError) => set({ hasPurchasesError: hasError }),

      // Live classes actions
      setLiveClasses: (classes) => set({ liveClasses: classes }),
      setIsLoadingLiveClasses: (isLoading) => set({ isLoadingLiveClasses: isLoading }),
      setHasLiveClassesError: (hasError) => set({ hasLiveClassesError: hasError }),

      // UI actions
      setShowWelcomeModal: (show) => set({ showWelcomeModal: show }),
      setShowOnboarding: (show) => set({ showOnboarding: show }),
      setShowAnnouncement: (show) => set({ showAnnouncement: show }),
      toggleSection: (section) => {
        // Update both expandedSection and expandedSections for compatibility
        set(state => ({
          expandedSection: state.expandedSection === section ? 'none' : section,
          expandedSections: {
            ...state.expandedSections,
            [section]: !state.expandedSections[section]
          }
        }));
      },

      // Utility functions
      getFilteredTemplates: () => {
        const { templates, templateFilter, templateSearchQuery } = get();
        return templates.filter((template) => {
          const matchesCategory = templateFilter === 'all' || template.category === templateFilter;
          const matchesSearch = templateSearchQuery === '' ||
            template.name.toLowerCase().includes(templateSearchQuery.toLowerCase());
          return matchesCategory && matchesSearch;
        });
      },

      getSelectedTemplate: () => {
        const { templates, selectedTemplateId } = get();
        return templates.find((template) => template.id === selectedTemplateId) ||
          (templates.length > 0 ? templates[0] : null);
      },

      getContinueLearningLesson: () => {
        const { enrollments, lessonProgress } = get();
        if (enrollments.length === 0) return null;

        // Find the most recently accessed lesson with incomplete progress
        const lessonEntries = Object.entries(lessonProgress);
        if (lessonEntries.length === 0) return null;

        // Sort by progress (incomplete first) and last accessed time
        const [lessonId, progress] = lessonEntries
          .filter(([_, data]) => data.progress < 100)
          .sort((a, b) => b[1].lastPosition - a[1].lastPosition)[0] || [null, null];

        if (!lessonId || !progress) return null;

        // For now return minimal info, this would be enhanced with actual lesson data
        return {
          courseId: enrollments[0].courseId, // This is simplified, would need to be mapped properly
          lessonId,
          title: "Continue your lesson", // This would be fetched from actual lesson data
          progress: progress.progress
        };
      },

      // ADDED: Store data initial state
      storeProducts: [],
      isLoadingStoreProducts: false, // Initialize as false
      hasStoreProductsError: false,
      lastStoreProductsLoadTime: null,

      // ADDED: Collections data initial state
      storeCollections: [],
      isLoadingStoreCollections: false, // Initialize as false
      hasStoreCollectionsError: false,
      lastStoreCollectionsLoadTime: null,

      // ADDED: Sale Products initial state
      saleProducts: [],
      isLoadingSaleProducts: false, // Initialize as false
      hasSaleProductsError: false,
      lastSaleProductsLoadTime: null,
    }),
    {
      name: 'student-dashboard-storage',
      partialize: (state) => ({
        // Only persist non-sensitive and UI state
        selectedTemplateId: state.selectedTemplateId,
        templateFilter: state.templateFilter,
        templateSearchQuery: state.templateSearchQuery,
        showWelcomeModal: state.showWelcomeModal,
        showOnboarding: state.showOnboarding,
        showAnnouncement: state.showAnnouncement,
        expandedSection: state.expandedSection,
      }),
    }
  )
  // ) // End equalityMiddleware
  )
  // ) // End performanceMiddleware
  )
);
