import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { performanceMiddleware, subscriptionTrackingMiddleware } from './middleware';
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
import { type UserEnrollment, type CourseProgress, type ModuleProgress, type Template, type Purchase, type LiveClass } from './types';

export interface StudentDashboardStore {
  // Dashboard Data Loading Actions
  loadUserDashboardData: (userId: string) => Promise<void>;
  loadUserEnrollments: (userId: string) => Promise<void>;
  loadUserProgress: (userId: string) => Promise<void>;
  loadUserTemplates: (userId: string) => Promise<void>;
  loadContinueLearningLesson: (userId: string) => Promise<void>;
  updateLessonProgress: (userId: string, lessonId: string, progressData: {
    status?: string;
    progress?: number;
    lastPosition?: number;
  }) => Promise<void>;
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
  
  // Progress data
  courseProgress: Record<string, CourseProgress>;
  moduleProgress: Record<string, ModuleProgress[]>;
  lessonProgress: Record<string, { 
    status: string;
    progress: number;
    lastPosition: number;
  }>;
  isLoadingProgress: boolean;
  hasProgressError: boolean;
  continueLearningLesson: {
    lessonId: string;
    lessonTitle: string;
    moduleId: string;
    moduleTitle: string;
    courseId: string;
    courseTitle: string;
    progress: number;
    lastPosition: number;
  } | null;
  
  // Templates data
  templates: Template[];
  selectedTemplateId: string | null;
  templateFilter: string;
  templateSearchQuery: string;
  isLoadingTemplates: boolean;
  hasTemplatesError: boolean;
  
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
  setCourseProgress: (courseId: string, progress: CourseProgress) => void;
  setModuleProgress: (courseId: string, progress: ModuleProgress[]) => void;
  setLessonProgress: (lessonId: string, progress: { status: string; progress: number; lastPosition: number }) => void;
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
}

export const useStudentDashboardStore = create<StudentDashboardStore>()(
  // Apply performance monitoring middleware in development mode
  subscriptionTrackingMiddleware(
  performanceMiddleware(
  persist(
    (set, get) => ({
      // Import actions from the actions module
      ...createActions(set, get),
      // User data
      userId: null,
      userProfile: null,
      isLoadingProfile: true,
      
      // Enrollment data
      enrollments: [],
      isLoadingEnrollments: false,
      hasEnrollmentError: false,
      
      // Progress data
      courseProgress: {},
      moduleProgress: {},
      lessonProgress: {},
      isLoadingProgress: true,
      hasProgressError: false,
      continueLearningLesson: null,
      
      // Templates data
      templates: [],
      selectedTemplateId: null,
      templateFilter: '',
      templateSearchQuery: '',
      isLoadingTemplates: false,
      hasTemplatesError: false,
      
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
  )
  )
);
