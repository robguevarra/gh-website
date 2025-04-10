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
import { getBrowserClient } from '@/lib/supabase/client';
import * as auth from '@/lib/supabase/auth';
import { CourseProgress, ModuleProgress, LessonProgress } from './types';

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
      
      // Get user profile data from the profiles table using browser client
      const supabase = getBrowserClient();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
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
   * Load user enrollments
   */
  loadUserEnrollments: async (userId: string) => {
    if (!userId) return;
    
    set({ isLoadingEnrollments: true, hasEnrollmentError: false });
    
    try {
      // Use browser client for client-side data fetching
      const supabase = getBrowserClient();
      
      // Get enrollments with course data
      const { data: enrollments, error } = await supabase
        .from('user_enrollments')
        .select(`
          *,
          course: courses (
            *,
            modules (
              *,
              lessons (*)
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Format and set enrollments
      set({ 
        enrollments: enrollments || [],
        isLoadingEnrollments: false 
      });
    } catch (error) {
      console.error('Error loading enrollments:', error);
      set({ 
        hasEnrollmentError: true,
        isLoadingEnrollments: false 
      });
    }
  },
  
  /**
   * Load user progress
   */
  loadUserProgress: async (userId: string) => {
    if (!userId) return;
    
    set({ isLoadingProgress: true, hasProgressError: false });
    
    try {
      // Use browser client for client-side data fetching
      const supabase = getBrowserClient();
      
      // Get progress data for lessons
      const { data: lessonProgressData, error: lessonError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);
      
      if (lessonError) throw lessonError;
      
      // Process the data to create course and module progress
      const courseProgressMap: Record<string, CourseProgress> = {};
      const moduleProgressMap: Record<string, ModuleProgress[]> = {};
      const lessonProgressMap: Record<string, LessonProgress> = {};
      
      // Convert lesson progress to a map for easy access
      lessonProgressData?.forEach(item => {
        lessonProgressMap[item.lesson_id] = {
          lessonId: item.lesson_id,
          status: item.status,
          progress: item.progress_percentage,
          lastPosition: item.last_position,
          completedAt: item.completed_at,
          lastAccessedAt: item.updated_at
        };
      });
      
      // Get course and module structure to calculate progress
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id, title,
          modules (id, title, lessons (id, title))
        `);
      
      if (coursesError) throw coursesError;
      
      // Calculate progress for each course and module
      courses?.forEach(course => {
        let totalLessons = 0;
        let completedLessons = 0;
        const moduleProgressList: ModuleProgress[] = [];
        
        course.modules?.forEach(module => {
          const moduleTotalLessons = module.lessons?.length || 0;
          let moduleCompletedLessons = 0;
          
          module.lessons?.forEach(lesson => {
            if (lessonProgressMap[lesson.id]?.status === 'completed') {
              completedLessons++;
              moduleCompletedLessons++;
            }
          });
          
          totalLessons += moduleTotalLessons;
          
          // Create module progress object
          moduleProgressList.push({
            moduleId: module.id,
            progress: moduleTotalLessons > 0 ? Math.round((moduleCompletedLessons / moduleTotalLessons) * 100) : 0,
            completedLessonsCount: moduleCompletedLessons,
            totalLessonsCount: moduleTotalLessons
          });
        });
        
        // Add module progress to map
        moduleProgressMap[course.id] = moduleProgressList;
        
        // Create course progress object
        courseProgressMap[course.id] = {
          courseId: course.id,
          course: {
            id: course.id,
            title: course.title,
            description: '',  // Default empty string as it's required by the Course type
            slug: course.id,  // Using ID as slug since it's required
            modules: course.modules?.map(module => ({
              id: module.id,
              courseId: course.id,
              title: module.title,
              order: 0, // Default value as required by Module type
              lessons: module.lessons?.map(lesson => ({
                id: lesson.id,
                moduleId: module.id,
                title: lesson.title,
                order: 0, // Default value as required by Lesson type
                duration: 0 // Default value as required by Lesson type
              })) || []
            })) || []
          },
          progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          completedLessonsCount: completedLessons,
          totalLessonsCount: totalLessons,
          startedAt: lessonProgressData?.[0]?.created_at,
          lastAccessedAt: lessonProgressData?.[0]?.updated_at
        };
      });
      
      // Set progress data
      set({
        courseProgress: courseProgressMap,
        moduleProgress: moduleProgressMap,
        lessonProgress: lessonProgressMap,
        isLoadingProgress: false
      });
      
      // Load continue learning lesson
      const store = get() as StudentDashboardStore;
      await store.loadContinueLearningLesson(userId);
      
    } catch (error) {
      console.error('Error loading progress:', error);
      set({ 
        hasProgressError: true,
        isLoadingProgress: false 
      });
    }
  },
  
  /**
   * Load user templates
   */
  loadUserTemplates: async (userId: string) => {
    if (!userId) return;
    
    set({ isLoadingTemplates: true, hasTemplatesError: false });
    
    try {
      // Use browser client for client-side data fetching
      const supabase = getBrowserClient();
      
      // Get templates the user has access to based on enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('user_enrollments')
        .select('course_id')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (enrollmentsError) throw enrollmentsError;
      
      // Get course IDs from enrollments
      const courseIds = enrollments?.map(e => e.course_id) || [];
      
      if (courseIds.length === 0) {
        set({ templates: [], isLoadingTemplates: false });
        return;
      }
      
      // Get templates for these courses
      const { data: templates, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .in('course_id', courseIds);
      
      if (templatesError) throw templatesError;
      
      // Set templates
      set({ 
        templates: templates || [],
        isLoadingTemplates: false 
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      set({ 
        hasTemplatesError: true,
        isLoadingTemplates: false 
      });
    }
  },
  
  /**
   * Load continue learning lesson
   */
  loadContinueLearningLesson: async (userId: string) => {
    if (!userId) return;
    
    try {
      // Use browser client for client-side data fetching
      const supabase = getBrowserClient();
      
      // Get the most recent lesson the user was working on
      const { data: recentLesson, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          lesson:lessons (id, title, module_id, course_id)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        // Handle 'No rows found' error gracefully
        if (error.code === 'PGRST116') {
          set({ continueLearningLesson: null });
          return;
        }
        throw error;
      }
      
      if (recentLesson && recentLesson.lesson) {
        set({
          continueLearningLesson: {
            courseId: recentLesson.lesson.course_id,
            courseTitle: '',  // Will be populated later
            moduleId: recentLesson.lesson.module_id,
            moduleTitle: '',  // Will be populated later
            lessonId: recentLesson.lesson.id,
            lessonTitle: recentLesson.lesson.title,
            progress: recentLesson.progress_percentage,
            lastPosition: recentLesson.last_position || 0
          }
        });
      } else {
        set({ continueLearningLesson: null });
      }
    } catch (error) {
      console.error('Error loading continue learning lesson:', error);
      set({ continueLearningLesson: null });
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
      
      // Sync with Supabase using browser client
      const supabase = getBrowserClient();
      await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          status: progressData.status,
          progress_percentage: progressData.progress,
          last_position: progressData.lastPosition,
          updated_at: new Date().toISOString()
        })
        .select();
      
      // After successful sync, refresh course progress data
      await get().loadUserProgress(userId);
      
    } catch (error) {
      console.error('Error updating lesson progress:', error);
      // No need to revert state as we don't have the previous state stored
      // Just set error flag
      set({ hasProgressError: true });
    }
  }
});
