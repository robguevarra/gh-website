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
import type {
  UICourseProgress,
  UIModuleProgress,
  UILessonProgress,
  ContinueLearningLesson
} from './types/index';

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
    const now = Date.now();

    // Check if we've loaded recently (within the last 10 seconds)
    const state = get();
    const recentEnrollmentsLoad = state.lastEnrollmentsLoadTime && now - state.lastEnrollmentsLoadTime < 10000;
    const recentProgressLoad = state.lastProgressLoadTime && now - state.lastProgressLoadTime < 10000;

    // Only set loading flags for data that needs to be loaded
    const loadingFlags: any = {};

    if (!recentEnrollmentsLoad && !state.isLoadingEnrollments) {
      loadingFlags.isLoadingEnrollments = true;
    }

    if (!recentProgressLoad && !state.isLoadingProgress) {
      loadingFlags.isLoadingProgress = true;
    }

    // Set loading flags if needed
    if (Object.keys(loadingFlags).length > 0) {
      set(loadingFlags);
    }

    try {
      // Load data in parallel for better performance
      const loadPromises = [];

      // Load enrollments if needed
      if (!recentEnrollmentsLoad && !state.isLoadingEnrollments) {
        loadPromises.push(store.loadUserEnrollments(userId));
      }

      // Load progress if needed
      if (!recentProgressLoad && !state.isLoadingProgress) {
        loadPromises.push(store.loadUserProgress(userId));
      }

      // Note: Templates are now loaded via Google Drive integration
      // and no longer need to be loaded here

      // Wait for all data to load
      if (loadPromises.length > 0) {
        await Promise.all(loadPromises);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      set({
        hasEnrollmentError: true,
        hasProgressError: true
      });
    }
  },

  /**
   * Load user enrollments
   */
  loadUserEnrollments: async (userId: string) => {
    if (!userId) return;

    // Check if we're already loading or loaded recently
    const state = get();
    const now = Date.now();

    if (state.isLoadingEnrollments) {
      return;
    }

    // Only load if we haven't loaded recently (within the last 10 seconds)
    if (state.lastEnrollmentsLoadTime && now - state.lastEnrollmentsLoadTime < 10000) {
      return;
    }

    set({
      isLoadingEnrollments: true,
      hasEnrollmentError: false,
      lastEnrollmentsLoadTime: now
    });

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

    // Check if we're already loading or loaded recently
    const state = get();
    const now = Date.now();

    if (state.isLoadingProgress) {
      return;
    }

    // Only load if we haven't loaded recently (within the last 10 seconds)
    if (state.lastProgressLoadTime && now - state.lastProgressLoadTime < 10000) {
      return;
    }

    set({
      isLoadingProgress: true,
      hasProgressError: false,
      lastProgressLoadTime: now
    });

    try {
      // Use browser client for client-side data fetching
      const supabase = getBrowserClient();

      // Process lesson progress with proper types
      const lessonProgressMap: Record<string, UILessonProgress> = {};

      // Fetch lesson progress data from Supabase
      const { data: lessonProgressData, error: lessonProgressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      if (lessonProgressError) {
        console.error('Error loading lesson progress:', lessonProgressError);
        set({ hasProgressError: true, isLoadingProgress: false });
        return;
      }

      // Process lesson progress data
      if (lessonProgressData) {
        lessonProgressData.forEach(progress => {
          lessonProgressMap[progress.lesson_id] = {
            status: progress.status || 'not-started',
            progress: progress.progress_percentage || 0,
            lastPosition: progress.last_position || 0,
            lastAccessedAt: progress.updated_at
          };
        });
      }

      // Get course and module structure to calculate progress
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id, title, description, slug,
          modules:modules (id, title, course_id, lessons:lessons (id, title, module_id))
        `);

      if (coursesError) throw coursesError;

      // Initialize progress maps with proper types
      const courseProgressMap: Record<string, UICourseProgress> = {};
      const moduleProgressMap: Record<string, UIModuleProgress[]> = {};

      // Calculate progress for each course and module
      courses?.forEach(course => {
        // Initialize module progress array for this course
        moduleProgressMap[course.id] = [];

        let totalLessons = 0;
        let completedLessons = 0;

        // Group lessons by module and calculate module progress
        if (course.modules) {
          course.modules.forEach(module => {
            const moduleId = module.id;
            const moduleLessons = module.lessons || [];

            // Skip modules with no lessons
            if (moduleLessons.length === 0) return;

            totalLessons += moduleLessons.length;

            // Calculate completed lessons for this module
            const moduleCompletedLessons = moduleLessons.reduce((count, lesson) => {
              const lessonProgress = lessonProgressMap[lesson.id];
              return count + (lessonProgress?.status === 'completed' ? 1 : 0);
            }, 0);

            completedLessons += moduleCompletedLessons;

            // Calculate overall module progress
            const moduleProgress: UIModuleProgress = {
              moduleId,
              progress: moduleLessons.length > 0 ? (moduleCompletedLessons / moduleLessons.length) * 100 : 0,
              completedLessonsCount: moduleCompletedLessons,
              totalLessonsCount: moduleLessons.length
            };

            // Add to module progress map
            moduleProgressMap[course.id].push(moduleProgress);
          });
        }

        // Create course progress object
        courseProgressMap[course.id] = {
          courseId: course.id,
          course: {
            id: course.id,
            title: course.title,
            description: course.description || '',
            slug: course.slug || course.id,
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
          totalLessonsCount: totalLessons
        };
      });

      // Set progress data
      set({
        courseProgress: courseProgressMap,
        moduleProgress: moduleProgressMap,
        lessonProgress: lessonProgressMap,
        isLoadingProgress: false
      });

      // Load continue learning lesson with optimized version
      // Check if we're already loading or loaded recently
      const state = get();
      const now = Date.now();

      if (!state.isLoadingContinueLearningLesson &&
          (!state.lastContinueLearningLessonLoadTime ||
           now - state.lastContinueLearningLessonLoadTime > 10000)) {
        // Set loading flag and timestamp
        set({
          isLoadingContinueLearningLesson: true,
          lastContinueLearningLessonLoadTime: now
        });

        // Load continue learning lesson
        const store = get() as StudentDashboardStore;
        await store.loadContinueLearningLesson(userId);
      }

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
   * @deprecated Now using direct Google Drive integration instead. This function is a no-op and is kept only for backward compatibility.
   */
  loadUserTemplates: async () => {
    // This function is intentionally empty and no longer used
    // Templates are now loaded directly from Google Drive via useGoogleDriveFiles hook
    console.log('loadUserTemplates is deprecated and no longer used. Use useGoogleDriveFiles hook instead.');
    return;
  },

  /**
   * Load continue learning lesson
   *
   * This function retrieves the most recent lesson a user was working on,
   * following the database schema where lessons are linked to courses via modules.
   */
  loadContinueLearningLesson: async (userId: string) => {
    if (!userId) {
      set({
        continueLearningLesson: null,
        isLoadingContinueLearningLesson: false
      });
      return;
    }

    // Check if we're already loading
    const state = get();
    if (state.isLoadingContinueLearningLesson) {
      return;
    }

    // Set loading flag
    set({ isLoadingContinueLearningLesson: true });

    try {
      // Use browser client for client-side data fetching
      const supabase = getBrowserClient();

      // Get the most recent lesson the user was working on with proper joins
      // Note: We need to join lessons → modules → courses to get the course_id
      // Fix: Use table aliases to prevent ambiguous column references
      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          lesson:lessons (
            id,
            title,
            module_id,
            module:modules (
              id,
              title,
              course_id:course_id,
              course:courses (
                id,
                title
              )
            )
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      // Log detailed query information for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Continue learning query results:', {
          hasData: !!data,
          dataLength: data?.length || 0,
          hasError: !!error
        });
      }

      if (error) {
        console.error('Error in continue learning query:', JSON.stringify(error));
        set({ continueLearningLesson: null });
        return;
      }

      // Check if we have any results
      const recentLesson = data && data.length > 0 ? data[0] : null;

      // Add defensive checks for the data structure
      if (recentLesson?.lesson?.module?.course_id &&
          recentLesson.lesson.id &&
          recentLesson.lesson.title) {

        // Create continue learning data with proper type safety
        const continueLearningData: ContinueLearningLesson = {
          courseId: recentLesson.lesson.module.course_id,
          courseTitle: recentLesson.lesson.module.course?.title || '',
          moduleId: recentLesson.lesson.module_id,
          moduleTitle: recentLesson.lesson.module?.title || '',
          lessonId: recentLesson.lesson.id,
          lessonTitle: recentLesson.lesson.title,
          progress: recentLesson.progress_percentage || 0,
          lastPosition: recentLesson.last_position || 0,
          status: recentLesson.status || 'not_started'
        };

        // Set the continue learning lesson in the store
        set({
          continueLearningLesson: continueLearningData,
          isLoadingContinueLearningLesson: false
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('Found continue learning lesson:', continueLearningData);
        }
      } else {
        // No recent lesson found or data structure is incomplete
        set({
          continueLearningLesson: null,
          isLoadingContinueLearningLesson: false
        });
      }

    } catch (error) {
      console.error('Error loading continue learning lesson:', error);
      set({
        continueLearningLesson: null,
        isLoadingContinueLearningLesson: false
      });
    }
  },

  /**
   * Update lesson progress and sync with Supabase
   *
   * This optimized version updates only the specific lesson progress
   * without triggering a full reload of all progress data
   * 
   * NOTE: This function triggers a cascade of automatic progress calculations:
   * 1. When it updates a user_progress record, a database trigger "update_module_progress_trigger" fires
   * 2. This calculates and updates module progress in the module_progress table
   * 3. When module_progress is updated, another trigger "update_course_progress_trigger" fires
   * 4. This calculates and updates course progress in the course_progress table
   * 
   * See ProjectDocs/Build_Notes/progress-tracking-system_phase-1_db-trigger-fix.md for details
   * on the automated progress calculation system and potential issues.
   * 
   * IMPORTANT: When initializing progress for a lesson the user is viewing for the first time,
   * always check if progress exists in the database first before initializing with default values.
   * Otherwise, you risk overwriting existing progress with zeros if the client-side store hasn't
   * yet loaded the progress data from the database.
   * 
   * Example of proper initialization (from app/dashboard/course/page.tsx):
   * ```
   * // Check database for existing progress before initializing with defaults
   * supabase
   *   .from('user_progress')
   *   .select('*')
   *   .eq('user_id', user.id)
   *   .eq('lesson_id', lessonId)
   *   .maybeSingle()
   *   .then(({ data: existingProgress }) => {
   *     if (existingProgress) {
   *       // Use existing progress values
   *       updateLessonProgress(user.id, lessonId, {
   *         status: existingProgress.status,
   *         progress: existingProgress.progress_percentage,
   *         lastPosition: existingProgress.last_position
   *       })
   *     } else {
   *       // No existing progress, initialize with defaults
   *       updateLessonProgress(user.id, lessonId, {
   *         status: 'in-progress',
   *         progress: 0,
   *         lastPosition: 0
   *       })
   *     }
   *   })
   * ```
   */
  updateLessonProgress: async (userId: string, lessonId: string, progressData: {
    status?: string;
    progress?: number;
    lastPosition?: number;
  }) => {
    if (!userId || !lessonId) return;

    try {
      console.log('updateLessonProgress called with:', { userId, lessonId, progressData });
      
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
        lastPosition: progressData.lastPosition !== undefined ? progressData.lastPosition : currentLessonProgress.lastPosition,
        lastAccessedAt: new Date().toISOString()
      };

      // Log progress change
      console.log('Lesson progress update:', {
        before: currentLessonProgress,
        after: updatedProgress
      });

      // Update local state
      set({
        lessonProgress: {
          ...get().lessonProgress,
          [lessonId]: updatedProgress
        }
      });

      // Sync with Supabase using browser client
      const supabase = getBrowserClient();
      
      // Use a simple approach to avoid SQL conflicts
      // First check if a record exists - just get the ID
      const { data: existingRecord, error: checkError } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle(); // Use maybeSingle instead of single to prevent errors
      
      if (checkError) {
        console.error('Error checking for existing record:', checkError);
        throw checkError;
      }
      
      // Format the update data
      const progressRecord: {
        status: string;
        progress_percentage: number;
        last_position: number;
        updated_at: string;
        completed_at?: string;
        user_id?: string;
        lesson_id?: string;
      } = {
        status: progressData.status || 'in-progress',
        progress_percentage: progressData.progress || 0,
        last_position: progressData.lastPosition || 0,
        updated_at: new Date().toISOString(),
      };
      
      // Add completed_at only if status is 'completed'
      if (progressData.status === 'completed') {
        progressRecord.completed_at = new Date().toISOString();
      }
      
      let error;
      
      // Use upsert operation with on_conflict for both insert and update
      console.log('Using upsert for progress record, existing ID:', existingRecord?.id);
      
      // Always include the user_id and lesson_id for new records
      progressRecord.user_id = userId;
      progressRecord.lesson_id = lessonId;
      
      const { data: upsertData, error: upsertError, status } = await supabase
        .from('user_progress')
        .upsert(progressRecord, {
          onConflict: 'user_id,lesson_id'
        })
        .select('*');
      
      console.log('Upsert response:', { data: upsertData, error: upsertError, status });
      error = upsertError;
      
      if (error) {
        console.error('Error updating progress in database:', error);
        throw error;
      }
      
      console.log('Progress updated in database successfully');

      // Update course and module progress calculations locally instead of reloading everything
      // This prevents unnecessary re-renders of components using progress data
      const { courseProgress, moduleProgress } = get();

      // Find which course and module this lesson belongs to
      const enrollments = get().enrollments;
      let courseId = null;
      let moduleId = null;

      // Find the course and module IDs for this lesson
      for (const enrollment of enrollments) {
        if (!enrollment.course?.modules) continue;

        for (const module of enrollment.course.modules) {
          if (!module.lessons) continue;

          const lessonExists = module.lessons.some(lesson => lesson.id === lessonId);
          if (lessonExists) {
            courseId = enrollment.course.id;
            moduleId = module.id;
            break;
          }
        }

        if (courseId && moduleId) break;
      }

      console.log('Found lesson in course:', { courseId, moduleId });

      // If we found the course and module, update their progress
      if (courseId && moduleId) {
        // Update module progress
        if (moduleProgress[courseId]) {
          const moduleProgressIndex = moduleProgress[courseId].findIndex(mp => mp.moduleId === moduleId);

          if (moduleProgressIndex >= 0) {
            const moduleProgressItem = moduleProgress[courseId][moduleProgressIndex];
            const isCompleted = updatedProgress.status === 'completed';

            console.log('Updating module progress:', {
              moduleId,
              beforeCount: moduleProgressItem.completedLessonsCount,
              currentLessonStatus: currentLessonProgress.status,
              newLessonStatus: updatedProgress.status
            });

            // Update completed lessons count if status changed to completed
            if (isCompleted && currentLessonProgress.status !== 'completed') {
              moduleProgressItem.completedLessonsCount += 1;
            } else if (!isCompleted && currentLessonProgress.status === 'completed') {
              moduleProgressItem.completedLessonsCount = Math.max(0, moduleProgressItem.completedLessonsCount - 1);
            }

            // Recalculate progress percentage
            moduleProgressItem.progress = moduleProgressItem.totalLessonsCount > 0 ?
              (moduleProgressItem.completedLessonsCount / moduleProgressItem.totalLessonsCount) * 100 : 0;

            console.log('Updated module progress:', {
              moduleId,
              afterCount: moduleProgressItem.completedLessonsCount,
              newProgress: moduleProgressItem.progress
            });

            // Update the module progress array
            const updatedModuleProgress = [...moduleProgress[courseId]];
            updatedModuleProgress[moduleProgressIndex] = moduleProgressItem;

            // Update state with new module progress
            set({
              moduleProgress: {
                ...moduleProgress,
                [courseId]: updatedModuleProgress
              }
            });
          }
        }

        // Update course progress
        if (courseProgress[courseId]) {
          const courseProgressItem = courseProgress[courseId];
          const isCompleted = updatedProgress.status === 'completed';

          console.log('Updating course progress:', {
            courseId,
            beforeCount: courseProgressItem.completedLessonsCount,
            currentLessonStatus: currentLessonProgress.status,
            newLessonStatus: updatedProgress.status
          });

          // Update completed lessons count if status changed to completed
          if (isCompleted && currentLessonProgress.status !== 'completed') {
            courseProgressItem.completedLessonsCount += 1;
          } else if (!isCompleted && currentLessonProgress.status === 'completed') {
            courseProgressItem.completedLessonsCount = Math.max(0, courseProgressItem.completedLessonsCount - 1);
          }

          // Recalculate progress percentage
          courseProgressItem.progress = courseProgressItem.totalLessonsCount > 0 ?
            Math.round((courseProgressItem.completedLessonsCount / courseProgressItem.totalLessonsCount) * 100) : 0;

          console.log('Updated course progress:', {
            courseId,
            afterCount: courseProgressItem.completedLessonsCount,
            newProgress: courseProgressItem.progress,
            totalLessons: courseProgressItem.totalLessonsCount
          });

          // Update state with new course progress
          set({
            courseProgress: {
              ...courseProgress,
              [courseId]: courseProgressItem
            }
          });
          
          // Verify the update worked by getting the state after the update
          console.log('Verified course progress after update:', get().courseProgress[courseId]);
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating lesson progress:', error);
      // No need to revert state as we don't have the previous state stored
      // Just set error flag
      set({ hasProgressError: true });
      return false;
    }
  }
});
