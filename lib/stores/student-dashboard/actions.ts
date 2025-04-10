/**
 * Student Dashboard Store Actions
 * 
 * This module contains action creators for the student dashboard store,
 * connecting to our Supabase data layer for real-time data.
 * 
 * Actions follow a standard pattern:
 * 1. Set loading state
 * 2. Make API call
 * 3. Update state with result
 * 4. Handle errors appropriately
 */

import { type StoreApi } from 'zustand';
import { type StudentDashboardStore } from './index';
import * as enrollmentAccess from '@/lib/supabase/enrollment-access';
import * as auth from '@/lib/supabase/auth';

// Define properly typed set and get functions for Zustand
type SetState = {
  (partial: StudentDashboardStore | Partial<StudentDashboardStore> | ((state: StudentDashboardStore) => StudentDashboardStore | Partial<StudentDashboardStore>), replace?: false): void;
  (state: StudentDashboardStore | ((state: StudentDashboardStore) => StudentDashboardStore), replace: true): void;
};

type GetState = () => StudentDashboardStore;

export const createActions = (
  set: SetState,
  get: GetState
) => ({
  /**
   * Initialize the dashboard with the authenticated user
   */
  initializeAuthenticatedUser: async () => {
    set({ isLoadingProfile: true });
    
    try {
      // Get the current authenticated user from Supabase
      const { user, error } = await auth.getCurrentUser();
      
      if (error || !user) {
        console.error('Error getting authenticated user:', error);
        set({ isLoadingProfile: false });
        return;
      }
      
      // Set the user ID in the store
      set({ userId: user.id });
      
      // Get user profile data from the profiles table
      const { data: profile, error: profileError } = await enrollmentAccess.getUserProfile(user.id);
      
      if (profileError || !profile) {
        console.error('Error getting user profile:', profileError);
        set({
          userProfile: {
            name: user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar: '/images/placeholder-avatar.png',
            joinedDate: new Date(user.created_at).toLocaleDateString()
          },
          isLoadingProfile: false
        });
        return;
      }
      
      // Set the user profile in the store
      set({
        userProfile: {
          name: profile.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          avatar: profile.avatar_url || '/images/placeholder-avatar.png',
          joinedDate: new Date(user.created_at).toLocaleDateString()
        },
        isLoadingProfile: false
      });
      
      // Load the rest of the user data
      const store = get() as StudentDashboardStore;
      await store.loadUserDashboardData(user.id);
      
    } catch (error) {
      console.error('Error initializing authenticated user:', error);
      set({ isLoadingProfile: false });
    }
  },
  /**
   * Load all user data for the dashboard
   */
  loadUserDashboardData: async (userId: string) => {
    if (!userId) return;

    const store = get() as StudentDashboardStore;
    
    // Start loading all data
    set({ 
      isLoadingEnrollments: true,
      isLoadingProgress: true,
      isLoadingTemplates: true
    });
    
    try {
      // Load enrollments with course data
      await store.loadUserEnrollments(userId);
      
      // Load progress data
      await store.loadUserProgress(userId);
      
      // Load templates
      await store.loadUserTemplates(userId);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      set({ 
        hasEnrollmentError: true,
        hasProgressError: true,
        hasTemplatesError: true
      });
    } finally {
      set({ 
        isLoadingEnrollments: false,
        isLoadingProgress: false,
        isLoadingTemplates: false
      });
    }
  },
  
  /**
   * Load user enrollments from Supabase
   */
  loadUserEnrollments: async (userId: string) => {
    if (!userId) return;
    
    set({ isLoadingEnrollments: true, hasEnrollmentError: false });
    
    try {
      const enrollmentsWithCourses = await enrollmentAccess.getUserEnrollmentsWithCourses(userId);
      
      if (enrollmentsWithCourses) {
        // Extract enrollments and ensure all required properties are included
        const enrollments = enrollmentsWithCourses.map(item => ({
          id: item.id,
          userId: item.user_id,
          courseId: item.course_id,
          enrolledAt: item.enrolled_at,
          expiresAt: item.expires_at,
          status: item.status,
          paymentId: item.payment_id,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          course: item.course
        }));
        
        set({ enrollments });
      }
    } catch (error) {
      console.error('Error loading enrollments:', error);
      set({ hasEnrollmentError: true });
    } finally {
      set({ isLoadingEnrollments: false });
    }
  },
  
  /**
   * Load user progress for all enrolled courses
   */
  loadUserProgress: async (userId: string) => {
    if (!userId) return;
    
    set({ isLoadingProgress: true, hasProgressError: false });
    
    try {
      const progressData = await enrollmentAccess.getUserCourseProgress(userId);
      
      if (progressData) {
        // Create course progress mapping
        const courseProgress = progressData.reduce((acc, course) => {
          acc[course.courseId] = {
            courseId: course.courseId,
            title: course.title,
            percentComplete: course.percentComplete,
            totalLessons: course.totalLessons,
            completedLessons: course.completedLessons
          };
          return acc;
        }, {} as Record<string, any>);
        
        // Create module progress mapping
        const moduleProgress = progressData.reduce((acc, course) => {
          course.moduleProgress.forEach(module => {
            acc[module.moduleId] = module.lessonsProgress.map(lesson => ({
              lessonId: lesson.lessonId,
              status: lesson.status,
              percentComplete: lesson.percentComplete
            }));
          });
          return acc;
        }, {} as Record<string, any>);
        
        // Create lesson progress mapping
        const lessonProgress = progressData.reduce((acc, course) => {
          course.moduleProgress.forEach(module => {
            module.lessonsProgress.forEach(lesson => {
              acc[lesson.lessonId] = {
                status: lesson.status,
                progress: lesson.percentComplete,
                lastPosition: lesson.lastPosition
              };
            });
          });
          return acc;
        }, {} as Record<string, any>);
        
        set({ courseProgress, moduleProgress, lessonProgress });
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      set({ hasProgressError: true });
    } finally {
      set({ isLoadingProgress: false });
    }
  },
  
  /**
   * Update lesson progress and sync with Supabase
   */
  updateLessonProgress: async (userId: string, lessonId: string, progressData: {
    status?: string;
    progress?: number;
    lastPosition?: number;
  }) => {
    if (!userId || !lessonId) return;
    
    try {
      // Update local state immediately for responsive UI
      const currentLessonProgress = get().lessonProgress[lessonId] || {
        status: 'not_started',
        progress: 0,
        lastPosition: 0
      };
      
      const updatedProgress = {
        ...currentLessonProgress,
        status: progressData.status || currentLessonProgress.status,
        progress: progressData.progress !== undefined ? progressData.progress : currentLessonProgress.progress,
        lastPosition: progressData.lastPosition !== undefined ? progressData.lastPosition : currentLessonProgress.lastPosition
      };
      
      // Update local state
      set({
        lessonProgress: {
          ...get().lessonProgress,
          [lessonId]: updatedProgress
        }
      });
      
      // Sync with Supabase
      await enrollmentAccess.updateLessonProgress(userId, lessonId, {
        status: progressData.status,
        progress_percentage: progressData.progress,
        last_position: progressData.lastPosition
      });
      
      // After successful sync, refresh course progress data
      await get().loadUserProgress(userId);
      
    } catch (error) {
      console.error('Error updating lesson progress:', error);
      // Revert to previous state on error?
    }
  },
  
  /**
   * Load templates the user has access to
   */
  loadUserTemplates: async (userId: string) => {
    if (!userId) return;
    
    set({ isLoadingTemplates: true, hasTemplatesError: false });
    
    try {
      const templates = await enrollmentAccess.getUserAccessibleTemplates(userId);
      
      if (templates) {
        set({ templates });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      set({ hasTemplatesError: true });
    } finally {
      set({ isLoadingTemplates: false });
    }
  },
  
  /**
   * Get the "continue learning" lesson for the user
   */
  loadContinueLearningLesson: async (userId: string) => {
    if (!userId) return;
    
    try {
      const continueLearningData = await enrollmentAccess.getContinueLearningLesson(userId);
      
      if (continueLearningData) {
        // Extract the needed data
        const lessonData = continueLearningData.lesson;
        const moduleData = lessonData.module;
        const courseData = moduleData.course;
        
        const continueLearningLesson = {
          lessonId: lessonData.id,
          lessonTitle: lessonData.title,
          moduleId: moduleData.id,
          moduleTitle: moduleData.title,
          courseId: courseData.id,
          courseTitle: courseData.title,
          progress: continueLearningData.progress_percentage,
          lastPosition: continueLearningData.last_position
        };
        
        set({ continueLearningLesson });
      } else {
        set({ continueLearningLesson: null });
      }
    } catch (error) {
      console.error('Error loading continue learning lesson:', error);
      set({ continueLearningLesson: null });
    }
  }
});
