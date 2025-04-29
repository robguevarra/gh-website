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

// Import required dependencies
import { type StudentDashboardStore } from './index';
import { getBrowserClient } from '@/lib/supabase/client';
import * as auth from '@/lib/supabase/auth';
import type {
  UICourseProgress,
  UIModuleProgress,
  UILessonProgress,
  ContinueLearningLesson
} from './types/index';
import { useStudentDashboardStore } from './index';

// Define a threshold for how long data is considered fresh (e.g., 5 minutes)
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

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
   * Clear user-specific state on logout
   */
  clearUserState: () => {
    // Get initial state values from the store definition itself
    // This avoids duplicating the initial state logic here
    const initialState = useStudentDashboardStore.getState();
    const resetState: Partial<StudentDashboardStore> = {
      userId: null,
      userProfile: null,
      isLoadingProfile: false, // Set loading to false, as there's no user to load
      enrollments: [],
      isLoadingEnrollments: false,
      hasEnrollmentError: false,
      lastEnrollmentsLoadTime: null,
      courseProgress: {},
      moduleProgress: {},
      lessonProgress: {},
      isLoadingProgress: false, // Set loading to false
      hasProgressError: false,
      lastProgressLoadTime: null,
      continueLearningLesson: null,
      isLoadingContinueLearningLesson: false,
      lastContinueLearningLessonLoadTime: null,
      // We might keep templates/purchases/liveClasses if they aren't strictly user-specific
      // or clear them too if desired. For now, clearing only core user/progress data.
    };

    // Use the standard set function without replace: true
    // We provide a partial state object containing only the fields to reset
    set(resetState);
  },
  /**
   * Load all user data for the dashboard
   */
  loadUserDashboardData: async (userId: string, force?: boolean) => {
    if (!userId) return;

    // This action now primarily orchestrates calls to more specific loading actions,
    // which contain their own staleness logic. We pass the 'force' parameter down.

    const store = get() as StudentDashboardStore;

    // Removed the internal 10-second check and loadingFlags logic.
    // The individual actions will handle staleness and prevent concurrent fetches.

    try {
      // Load data in parallel for better performance, passing down 'force' flag.
      await Promise.all([
        store.loadUserEnrollments(userId, force),
        store.loadUserProgress(userId, force)
        // Note: loadUserTemplates is deprecated and a no-op
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set general error flags if orchestration fails, though individual actions
      // also set their specific flags.
      set({
        hasEnrollmentError: true,
        hasProgressError: true
      });
    }
  },

  /**
   * Load user enrollments
   */
  loadUserEnrollments: async (userId: string, force?: boolean) => {
    if (!userId) return;

    // Check if data is fresh and user hasn't changed
    const state = get();
    const now = Date.now();
    if (!force && 
        state.userId === userId && 
        state.lastEnrollmentsLoadTime && 
        (now - state.lastEnrollmentsLoadTime < STALE_THRESHOLD)) {
      // Data is fresh, no need to fetch
      return;
    }

    // Prevent concurrent fetches for the same data
    if (state.isLoadingEnrollments) {
      return;
    }

    // Set loading state
    set({
      isLoadingEnrollments: true,
      hasEnrollmentError: false,
      // Do NOT update lastLoadTime here, only after successful fetch
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
        isLoadingEnrollments: false,
        lastEnrollmentsLoadTime: Date.now() // Update timestamp on success
      });
    } catch (error) {
      console.error('Error loading enrollments:', error);
      set({
        hasEnrollmentError: true,
        isLoadingEnrollments: false
        // Don't update timestamp on error
      });
    }
  },

  /**
   * Load user progress
   */
  loadUserProgress: async (userId: string, force?: boolean) => {
    if (!userId) return;

    // Check if data is fresh and user hasn't changed
    const state = get();
    const now = Date.now();
    if (!force && 
        state.userId === userId && 
        state.lastProgressLoadTime && 
        (now - state.lastProgressLoadTime < STALE_THRESHOLD)) {
      // Data is fresh, no need to fetch
      return;
    }

    // Prevent concurrent fetches for the same data
    if (state.isLoadingProgress) {
      return;
    }

    // Set loading state
    set({
      isLoadingProgress: true,
      hasProgressError: false,
      // Do NOT update lastLoadTime here, only after successful fetch
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

        // Course progress calculated based on completed lessons
      });

      // Always get the course progress from the database
      // This ensures we have the most accurate data
      const courseIds = Object.keys(courseProgressMap);
      if (courseIds.length > 0) {
        // Get the course progress from the database
        const { data: dbCourseProgress, error: dbProgressError } = await supabase
          .from('course_progress')
          .select('*')
          .eq('user_id', userId);

        if (!dbProgressError && dbCourseProgress) {
          // Update course progress with database values

          // Update the course progress with the database values
          dbCourseProgress.forEach(progress => {
            if (courseProgressMap[progress.course_id]) {
              // Calculate the completed lessons based on the progress percentage
              const totalLessons = courseProgressMap[progress.course_id].totalLessonsCount;
              const completedLessons = Math.round((progress.progress_percentage / 100) * totalLessons);

              // Update progress from database values

              // Update the course progress with the database values
              courseProgressMap[progress.course_id] = {
                ...courseProgressMap[progress.course_id],
                progress: progress.progress_percentage,
                completedLessonsCount: completedLessons
              };
            } else {
              // If we don't have this course in our map, try to find the course in our courses array
              const course = courses?.find(c => c.id === progress.course_id);
              if (course) {
                // Count total lessons
                let totalLessons = 0;
                if (course.modules) {
                  course.modules.forEach(module => {
                    if (module.lessons) {
                      totalLessons += module.lessons.length;
                    }
                  });
                }

                // Calculate completed lessons based on progress percentage
                const completedLessons = Math.round((progress.progress_percentage / 100) * totalLessons);

                // Create a new course progress entry
                courseProgressMap[progress.course_id] = {
                  courseId: progress.course_id,
                  progress: progress.progress_percentage,
                  completedLessonsCount: completedLessons,
                  totalLessonsCount: totalLessons,
                  course: {
                    id: course.id,
                    title: course.title,
                    description: course.description || '',
                    slug: course.slug || course.id,
                    modules: course.modules?.map(module => ({
                      id: module.id,
                      courseId: course.id,
                      title: module.title,
                      order: 0,
                      lessons: module.lessons?.map(lesson => ({
                        id: lesson.id,
                        moduleId: module.id,
                        title: lesson.title,
                        order: 0,
                        duration: 0
                      })) || []
                    })) || []
                  }
                };
              }
            }
          });
        }
      }

      // Set progress data
      set({
        courseProgress: courseProgressMap,
        moduleProgress: moduleProgressMap,
        lessonProgress: lessonProgressMap,
        isLoadingProgress: false,
        lastProgressLoadTime: Date.now() // Update timestamp on success
      });

      // Load continue learning lesson after progress is loaded
      // We can pass the force parameter down if needed, but often
      // continue learning can use its own staleness check.
      await get().loadContinueLearningLesson(userId, force); 

    } catch (error) {
      console.error('Error loading progress:', error);
      set({
        hasProgressError: true,
        isLoadingProgress: false
        // Don't update timestamp on error
      });
    }
  },

  /**
   * Load user templates
   * @deprecated Now using direct Google Drive integration instead. This function is a no-op and is kept only for backward compatibility.
   */
  loadUserTemplates: async (userId: string, force?: boolean) => {
    // This function is intentionally empty and no longer used
    // Templates are now loaded directly from Google Drive via useGoogleDriveFiles hook
    // loadUserTemplates is deprecated and no longer used. Use useGoogleDriveFiles hook instead.
    return;
  },

  /**
   * Load continue learning lesson
   *
   * This function retrieves the most recent lesson a user was working on,
   * following the database schema where lessons are linked to courses via modules.
   */
  loadContinueLearningLesson: async (userId: string, force?: boolean) => {
    if (!userId) {
      set({
        continueLearningLesson: null,
        isLoadingContinueLearningLesson: false
      });
      return;
    }

    // Check if data is fresh and user hasn't changed
    const state = get();
    const now = Date.now();
    if (!force && 
        state.userId === userId && 
        state.lastContinueLearningLessonLoadTime && 
        (now - state.lastContinueLearningLessonLoadTime < STALE_THRESHOLD)) {
       // Data is fresh, no need to fetch
      return;
    }

    // Prevent concurrent fetches for the same data
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

      // Process continue learning query results

      if (error) {
        // Error in continue learning query
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
          isLoadingContinueLearningLesson: false,
          lastContinueLearningLessonLoadTime: Date.now() // Update timestamp on success
        });

        if (process.env.NODE_ENV === 'development') {
          // Found continue learning lesson, update state
        }
      } else {
        // No recent lesson found or data structure is incomplete
        set({
          continueLearningLesson: null,
          isLoadingContinueLearningLesson: false,
          lastContinueLearningLessonLoadTime: Date.now() // Update timestamp even if null, means we checked
        });
      }

    } catch (error) {
      console.error('Error loading continue learning lesson:', error);
      set({
        continueLearningLesson: null,
        isLoadingContinueLearningLesson: false
        // Don't update timestamp on error
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
      // Update lesson progress with provided data

      // INDUSTRY BEST PRACTICE: Get the current state before making any updates
      // This ensures we have the most up-to-date data
      const currentLessonProgress = get().lessonProgress[lessonId] || {
        status: 'not_started',
        progress: 0,
        lastPosition: 0
      };

      // Create the updated progress object
      const updatedProgress = {
        ...currentLessonProgress,
        status: progressData.status || currentLessonProgress.status,
        progress: progressData.progress !== undefined ? progressData.progress : currentLessonProgress.progress,
        lastPosition: progressData.lastPosition !== undefined ? progressData.lastPosition : currentLessonProgress.lastPosition,
        lastAccessedAt: new Date().toISOString()
      };

      // Track lesson progress change

      // Update local state
      set({
        lessonProgress: {
          ...get().lessonProgress,
          [lessonId]: updatedProgress
        }
      });

      // Sync with Supabase using browser client
      const supabase = getBrowserClient();

      // INDUSTRY BEST PRACTICE: Skip the check for existing records
      // The upsert operation will handle both insert and update cases

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
      // Using upsert for progress record

      // Always include the user_id and lesson_id for new records
      progressRecord.user_id = userId;
      progressRecord.lesson_id = lessonId;

      // INDUSTRY BEST PRACTICE: Only extract what we need from the response
      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert(progressRecord, {
          onConflict: 'user_id,lesson_id'
        });

      // Process upsert response
      error = upsertError;

      if (error) {
        console.error('Error updating progress in database:', error);
        throw error;
      }

      // Progress updated in database successfully

      // INDUSTRY BEST PRACTICE: Reload all progress data from the database
      // This ensures we have the most accurate and consistent data
      // Instead of incrementally updating the progress in memory, which can lead to inconsistencies

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

      // If we found the course, reload all progress data for that course
      if (courseId) {
        // Reload all progress data for this user
        // This ensures we have the most accurate and consistent data
        await get().loadUserProgress(userId);
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
