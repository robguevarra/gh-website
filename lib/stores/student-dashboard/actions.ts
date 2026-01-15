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
import { type StudentDashboardStore, type ProductData, type StoreCollection, type UserContextData } from './index';
import { getBrowserClient } from '@/lib/supabase/client';
import * as auth from '@/lib/supabase/auth';
import type { Database } from '@/types/supabase';
import type {
  UICourseProgress,
  UIModuleProgress,
  UILessonProgress,
  ContinueLearningLesson,
  Announcement
} from './types/index';
import { useStudentDashboardStore } from './index';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UserEnrollment,
} from './types/index';
import { fetchPurchaseHistory } from '@/lib/services/purchaseHistory';

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
    // Set initial loading state immediately
    set({ isLoadingProfile: true });

    // Create a timeout promise to prevent hanging operations
    const timeout = (ms: number) => new Promise<{ timedOut: true }>(
      resolve => setTimeout(() => resolve({ timedOut: true }), ms)
    );

    try {
      // Get the current authenticated user from Supabase
      const { user, error } = await auth.getCurrentUser();

      if (error || !user) {
        console.error('Error getting authenticated user:', error);
        set({
          isLoadingProfile: false,
          hasProfileError: true
        });
        return;
      }

      // Set the user ID in the store immediately to allow early rendering with minimal data
      set({
        userId: user.id,
        // Initialize a minimal profile with email-based fallbacks immediately
        // This ensures we always have something to display even if queries time out
        userProfile: {
          name: user.email?.split('@')[0] || 'User',
          email: user.email || '',
          avatar: '/images/placeholder-avatar.png',
          joinedDate: new Date(user.created_at).toLocaleDateString()
        }
      });

      // Get user profile data with timeout protection
      const supabase = getBrowserClient();

      // Log the user ID to help with debugging
      console.log('Attempting to find profile for user ID:', user.id);

      // First try direct email match which is more reliable than UUID matching
      // This handles cases where the ID format might differ between auth and profile tables
      let userEmailPromise;

      if (user.email) {
        userEmailPromise = supabase
          .from('unified_profiles')
          .select('id, first_name, last_name, phone, email')
          .eq('email', user.email)
          .maybeSingle();
      } else {
        // No email available, create a rejected promise to skip this step
        userEmailPromise = Promise.resolve({ data: null, error: new Error('No email available') });
        console.warn('No email available for user, skipping email match');
      }

      // Race the query against a timeout
      const userEmailResult = await Promise.race([
        userEmailPromise,
        timeout(3000) // 3 second timeout
      ]);

      // Handle possible timeout or success with email query
      if ('timedOut' in userEmailResult) {
        console.warn('unified_profiles email query timed out, trying ID match');
      } else {
        const { data: emailProfile, error: emailError } = userEmailResult;

        if (!emailError && emailProfile) {
          // Found profile by email, use this data
          const firstName = emailProfile.first_name || '';
          const lastName = emailProfile.last_name || '';
          const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

          // Update profile with unified_profiles data
          set({
            userProfile: {
              name: fullName || user.email?.split('@')[0] || 'User',
              email: emailProfile.email || user.email || '',
              avatar: '/images/placeholder-avatar.png',
              joinedDate: new Date(user.created_at).toLocaleDateString()
            }
          });

          console.log('Loaded profile from unified_profiles (email match):', fullName || 'Name not found');

          // Successfully found by email, skip the ID match attempt
          return;
        }

        // If we reach here, email match failed, try ID match as backup
        console.log('Email match failed, trying ID match:', user.id);
      }

      // Try unified_profiles with case-insensitive UUID match as backup
      // Convert ID to lowercase to handle case sensitivity issues
      const unifiedProfilePromise = supabase
        .from('unified_profiles')
        .select('id, first_name, last_name, phone, email')
        .filter('id', 'ilike', user.id.toLowerCase()) // Use ilike for case-insensitive matching
        .maybeSingle();

      // Race the query against a timeout
      const unifiedProfileResult = await Promise.race([
        unifiedProfilePromise,
        timeout(3000) // 3 second timeout
      ]);

      // Handle possible timeout
      if ('timedOut' in unifiedProfileResult) {
        console.warn('unified_profiles ID query timed out, using fallback data');
        // We don't need to set anything here since we already set the fallback profile
      } else {
        const { data: unifiedProfile, error: unifiedError } = unifiedProfileResult;

        if (unifiedError) {
          console.error('Error fetching unified profile:', unifiedError);
        }

        if (!unifiedError && unifiedProfile) {
          // Format name with proper validation
          const firstName = unifiedProfile.first_name || '';
          const lastName = unifiedProfile.last_name || '';
          const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

          // Update profile with unified_profiles data
          set({
            userProfile: {
              name: fullName || user.email?.split('@')[0] || 'User',
              email: unifiedProfile.email || user.email || '',
              avatar: '/images/placeholder-avatar.png',
              joinedDate: new Date(user.created_at).toLocaleDateString()
            }
          });

          console.log('Loaded profile from unified_profiles (ID match):', fullName || 'Name not found');
        } else {
          // Fall back to profiles table with timeout protection
          const profilePromise = supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

          // Race the profiles query against a timeout
          const profileResult = await Promise.race([
            profilePromise,
            timeout(3000) // 3 second timeout
          ]);

          if ('timedOut' in profileResult) {
            console.warn('profiles query timed out, using fallback data');
            // We already have fallback data set, so no action needed
          } else {
            const { data: profile, error: profileError } = profileResult;

            if (!profileError && profile) {
              // Format name with proper validation
              const firstName = profile.first_name || '';
              const lastName = profile.last_name || '';
              const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

              // Update profile with profiles table data
              set({
                userProfile: {
                  name: fullName || user.email?.split('@')[0] || 'User',
                  email: user.email || '',
                  avatar: profile.avatar_url || '/images/placeholder-avatar.png',
                  joinedDate: new Date(user.created_at).toLocaleDateString()
                }
              });

              console.log('Loaded profile from profiles table:', fullName || 'Name not found');
            } else {
              console.log('No profile found in either table, using email fallback');
            }
          }
        }
      }

      // Always mark loading as complete, regardless of what data we found
      set({ isLoadingProfile: false });

      // Load the rest of the user data in the background
      // This won't block the UI from rendering with the profile data we already have
      const store = get() as StudentDashboardStore;
      store.loadUserDashboardData(user.id).catch(err => {
        console.error('Error loading user dashboard data:', err);
      });

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
    if (!userId) {
      return;
    }

    const store = get() as StudentDashboardStore;

    try {
      // Load data in parallel including purchases
      const promises = [
        store.loadUserEnrollments(userId, force),
        store.loadUserProgress(userId, force),
        store.loadStoreProducts(userId, undefined, force),
        store.loadStoreCollections(force),
        store.loadPurchases(userId, force)
      ];

      await Promise.all(promises);

    } catch (error) {
      console.error('[Store Action] loadUserDashboardData: Error loading dashboard data:', error);
      set({
        hasEnrollmentError: true,
        hasProgressError: true,
        hasStoreProductsError: true,
        hasStoreCollectionsError: true,
        hasPurchasesError: true
      });
    }
  },

  /**
   * Load a specific course enrollment
   * This is optimized for when we know exactly which course we need
   * Bypasses the 1000 row limit by targeting the exact enrollment
   */
  loadSpecificEnrollment: async (userId: string, courseId: string) => {
    if (!userId || !courseId) return;

    set({ isLoadingEnrollments: true });


    try {
      const supabase = getBrowserClient();

      // Direct query for the specific enrollment we need
      const { data: enrollment, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (id, title, description, slug)
        `)
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (error) {
        console.error('Error fetching specific enrollment:', error);
        set({ isLoadingEnrollments: false, hasEnrollmentError: true });
        return;
      }

      if (!enrollment) {
        console.log(`No enrollment found for user ${userId} and course ${courseId}`);
        set({ isLoadingEnrollments: false });
        return;
      }

      // Get modules for this course
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (modulesError) {
        console.error('Error fetching modules:', modulesError);
      }

      let lessonsData: any[] = [];
      if (modulesData && modulesData.length > 0) {


        const moduleIds = modulesData.map(module => module.id);

        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('position', { ascending: true });

        if (lessonsError) {
          console.error('Error fetching lessons:', lessonsError);
        } else if (lessons) {
          lessonsData = lessons;

        }
      }

      // Build the course structure
      const courseObject = enrollment.courses;

      // Get modules for this course
      const courseModules = modulesData ? modulesData
        .map(module => {
          // Get lessons for this module
          const moduleLessons = lessonsData
            .filter(lesson => lesson.module_id === module.id)
            .sort((a, b) => (a.position || 0) - (b.position || 0));

          return {
            ...module,
            lessons: moduleLessons
          };
        })
        .sort((a, b) => (a.position || 0) - (b.position || 0)) : [];

      // Create the course data with full structure
      const courseData = courseObject && typeof courseObject === 'object'
        ? {
          id: courseObject.id,
          title: courseObject.title,
          description: courseObject.description ?? '',
          slug: courseObject.slug,
          modules: courseModules,
        }
        : undefined;

      // Create a single formatted enrollment - following EXACT UserEnrollment interface
      const formattedEnrollment: UserEnrollment = {
        id: enrollment.id,
        userId: enrollment.user_id,
        courseId: enrollment.course_id,
        enrolledAt: enrollment.enrolled_at ?? '',
        expiresAt: enrollment.expires_at,
        status: enrollment.status as UserEnrollment['status'],
        paymentId: enrollment.transaction_id, // Use transaction_id instead of payment_id
        createdAt: enrollment.enrolled_at ?? '', // Use enrolled_at as fallback for created/updated
        updatedAt: enrollment.last_accessed_at ?? enrollment.enrolled_at ?? '',
        course: courseData,
      };

      // Get existing enrollments
      const existingEnrollments = get().enrollments || [];

      // Replace any existing enrollment for this course or add as new
      const updatedEnrollments = [
        ...existingEnrollments.filter(e => e.courseId !== courseId),
        formattedEnrollment
      ];

      // Update the store
      set({
        enrollments: updatedEnrollments,
        isLoadingEnrollments: false,
        lastEnrollmentsLoadTime: Date.now(),
      });

      return formattedEnrollment;
    } catch (err) {
      console.error('Error in loadSpecificEnrollment:', err);
      set({ isLoadingEnrollments: false, hasEnrollmentError: true });
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

      // STEP 1: Fetch user enrollments with related course data - with specific user filter

      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses!enrollments_course_id_fkey (
            id,
            title,
            description,
            slug
          )
        `)
        .eq('user_id', userId)
        // Use enrolled_at for sorting since created_at doesn't exist
        .order('enrolled_at', { ascending: false });

      if (error) {
        console.error('Error fetching enrollments:', error);
        // Add error state to the store definition (lib/stores/student-dashboard/index.ts)
        // for this property to be valid: errorEnrollments: string | null;
        // Initialize it to null in createStore.
        set({ isLoadingEnrollments: false, hasEnrollmentError: true /* errorEnrollments: error.message */ }); // Use existing error flag for now
        return; // Exit if fetch failed
      }

      if (!enrollments) {
        set({ enrollments: [], isLoadingEnrollments: false }); // Handle null data case
        return;
      }

      // STEP 2: For each enrolled course, fetch the course modules
      let formattedEnrollments: UserEnrollment[] = [];

      if (enrollments && enrollments.length > 0) {


        // Get all course IDs from enrollments
        const courseIds = enrollments
          .map(enrollment => enrollment.course_id)
          .filter(id => id); // Filter out any null/undefined

        // Fetch modules for all enrolled courses
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .in('course_id', courseIds);

        if (modulesError) {
          console.error('Error fetching modules:', modulesError);
        }

        // STEP 3: Fetch lessons for all modules
        let lessonsData: any[] = [];
        if (modulesData && modulesData.length > 0) {


          const moduleIds = modulesData.map(module => module.id);

          const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('*')
            .in('module_id', moduleIds);

          if (lessonsError) {
            console.error('Error fetching lessons:', lessonsError);
          } else if (lessons) {
            lessonsData = lessons;

          }
        }

        // Now build the full course structure with modules and lessons
        formattedEnrollments = enrollments.map(enrollment => {
          // Get course data from the enrollment
          const courseObject = enrollment.courses;

          // Get modules for this course
          const courseModules = modulesData ? modulesData
            .filter(module => module.course_id === enrollment.course_id)
            .map(module => {
              // Get lessons for this module
              const moduleLessons = lessonsData
                .filter(lesson => lesson.module_id === module.id)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

              return {
                ...module,
                lessons: moduleLessons
              };
            })
            .sort((a, b) => (a.position || 0) - (b.position || 0)) : [];

          // Create the course data with full structure
          const courseData = courseObject && typeof courseObject === 'object'
            ? {
              id: courseObject.id,
              title: courseObject.title,
              description: courseObject.description ?? '',
              slug: courseObject.slug,
              modules: courseModules,
            }
            : undefined;

          return {
            id: enrollment.id,
            userId: enrollment.user_id,
            courseId: enrollment.course_id,
            enrolledAt: enrollment.enrolled_at ?? '',
            expiresAt: enrollment.expires_at,
            status: enrollment.status as UserEnrollment['status'],
            course: courseData,
          };
        });
      }

      set({
        enrollments: formattedEnrollments,
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
   * Load user progress (Refactored)
   *
   * Fetches enrolled course structure, lesson progress, and course progress,
   * then maps this data to the store state. Trusts course_progress table
   * (updated by DB triggers) for overall percentages.
   */
  loadUserProgress: async (userId: string, force?: boolean) => {
    if (!userId) return;

    // Staleness check
    const state = get();
    const now = Date.now();
    if (!force &&
      state.userId === userId &&
      state.lastProgressLoadTime &&
      (now - state.lastProgressLoadTime < STALE_THRESHOLD)) {
      return;
    }

    // Prevent concurrent fetches
    if (state.isLoadingProgress) {
      return;
    }

    // Set loading state
    set({
      isLoadingProgress: true,
      hasProgressError: false,
    });

    try {
      const supabase = getBrowserClient();

      // --- 1. Fetch Enrolled Courses with Structure --- 
      // (Replaces fetching ALL courses)
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          status,
          course: courses!enrollments_course_id_fkey (
            id, title, description, slug,
            modules (
              id, title, course_id, 
              lessons (id, title, module_id)
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;
      if (!enrollmentsData) throw new Error("No enrollment data found.");

      // Extract relevant course structures from enrollment data
      const enrolledCourses = enrollmentsData
        .map(e => e.course)
        .filter(course => course !== null) as any[]; // Use 'as any[]' temporarily or define a proper type

      // --- 2. Fetch User Progress Data --- 
      const {
        data: lessonProgressData,
        error: lessonProgressError
      } = await supabase
        .from('user_progress')
        .select('lesson_id, status, progress_percentage, last_position, updated_at')
        .eq('user_id', userId);

      if (lessonProgressError) throw lessonProgressError;

      const {
        data: dbCourseProgressData,
        error: dbCourseProgressError
      } = await supabase
        .from('course_progress')
        .select('course_id, progress_percentage')
        .eq('user_id', userId);

      if (dbCourseProgressError) throw dbCourseProgressError;

      // --- 3. Map Fetched Data to State --- 
      const lessonProgressMap: Record<string, UILessonProgress> = {};
      if (lessonProgressData) {
        lessonProgressData.forEach(progress => {
          lessonProgressMap[progress.lesson_id] = {
            status: progress.status || 'not_started',
            progress: progress.progress_percentage || 0,
            lastPosition: progress.last_position || 0,
            lastAccessedAt: progress.updated_at ?? undefined // Handle potential null
          };
        });
      }

      const courseProgressMap: Record<string, UICourseProgress> = {};
      const moduleProgressMap: Record<string, UIModuleProgress[]> = {}; // Will be populated alongside courseProgressMap

      enrolledCourses.forEach(course => {
        if (!course) return; // Skip if course data is null

        moduleProgressMap[course.id] = []; // Initialize module progress for this course
        let totalLessons = 0;
        let completedLessons = 0;

        if (course.modules) {
          course.modules.forEach((module: any) => { // Use 'any' temporarily or define type
            if (!module || !module.lessons) return; // Skip if module or lessons are null

            const moduleLessons = module.lessons || [];
            const moduleTotalLessons = moduleLessons.length;
            if (moduleTotalLessons === 0) return; // Skip empty modules

            totalLessons += moduleTotalLessons;

            // Calculate completed lessons for this module based *only* on lessonProgressMap
            const moduleCompletedLessons = moduleLessons.reduce((count: number, lesson: any) => {
              const lessonProgress = lessonProgressMap[lesson.id];
              return count + (lessonProgress?.status === 'completed' ? 1 : 0);
            }, 0);

            completedLessons += moduleCompletedLessons;

            // Calculate module progress percentage based on completed count
            const moduleProgressPercent = moduleTotalLessons > 0 ? (moduleCompletedLessons / moduleTotalLessons) * 100 : 0;

            // Add to module progress map
            moduleProgressMap[course.id].push({
              moduleId: module.id,
              progress: moduleProgressPercent,
              completedLessonsCount: moduleCompletedLessons,
              totalLessonsCount: moduleTotalLessons
            });
          });
        }

        // Get the authoritative progress percentage from course_progress table
        const dbCourseProgress = dbCourseProgressData?.find(p => p.course_id === course.id);
        const authoritativeProgressPercent = dbCourseProgress?.progress_percentage ?? 0;

        // Create the final course progress object using authoritative percentage
        // but calculated lesson counts (as course_progress doesn't store counts)
        courseProgressMap[course.id] = {
          courseId: course.id,
          // Re-structure course data slightly to match UICourseProgress type
          course: {
            id: course.id,
            title: course.title ?? '',
            description: course.description ?? '',
            slug: course.slug ?? course.id,
            modules: course.modules // Assuming modules structure is compatible
          },
          progress: authoritativeProgressPercent, // Use DB value
          completedLessonsCount: completedLessons, // Use calculated value
          totalLessonsCount: totalLessons // Use calculated value
        };
      });

      // --- 4. Update Store State --- 
      set({
        lessonProgress: lessonProgressMap,
        moduleProgress: moduleProgressMap,
        courseProgress: courseProgressMap,
        isLoadingProgress: false,
        lastProgressLoadTime: Date.now() // Update timestamp on success
      });

      // --- 5. Trigger Continue Learning Lesson Load --- 
      await get().loadContinueLearningLesson(userId, force);

    } catch (error) {
      console.error('Error loading progress (refactored):', error);
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
  }): Promise<void> => {
    if (!userId || !lessonId) return;

    // Store previous state for potential rollback
    const previousLessonProgress = { ...get().lessonProgress };
    const previousLessonState = previousLessonProgress[lessonId]; // Can be undefined

    try {
      // Optimistic Update: Get the current state before making any updates
      const currentLessonProgress = previousLessonProgress[lessonId] || {
        status: 'not_started',
        progress: 0,
        lastPosition: 0
      };

      // Create the updated progress object for local state
      const updatedProgressForState: UILessonProgress = {
        status: progressData.status || currentLessonProgress.status,
        progress: progressData.progress !== undefined ? progressData.progress : currentLessonProgress.progress,
        lastPosition: progressData.lastPosition !== undefined ? progressData.lastPosition : currentLessonProgress.lastPosition,
        lastAccessedAt: new Date().toISOString()
      };

      // Update local state optimistically
      set({
        lessonProgress: {
          ...previousLessonProgress, // Use the state captured before update
          [lessonId]: updatedProgressForState
        }
      });

      // Sync with Supabase using browser client
      const supabase = getBrowserClient();

      // Format the update data for Supabase upsert
      // Ensure required fields are present and correctly typed
      const progressRecord = {
        user_id: userId, // Guaranteed string by initial check
        lesson_id: lessonId, // Guaranteed string by initial check
        status: progressData.status || 'in-progress',
        progress_percentage: progressData.progress ?? 0, // Use nullish coalescing for 0
        last_position: progressData.lastPosition ?? 0, // Use nullish coalescing for 0
        updated_at: new Date().toISOString(),
        completed_at: progressData.status === 'completed' ? new Date().toISOString() : undefined,
      };

      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert(progressRecord, {
          onConflict: 'user_id,lesson_id'
        });

      if (upsertError) {
        console.error('Error updating progress in database:', upsertError);
        // Rollback optimistic update on error
        set({ lessonProgress: previousLessonProgress });
        throw upsertError; // Re-throw error after rollback
      }

      // Progress updated in database successfully
      // Reload all progress data to ensure consistency after triggers
      await get().loadUserProgress(userId); // Keeping the reload for now

    } catch (error) {
      // Handle any errors (including re-thrown upsertError)
      console.error('Error updating lesson progress:', error);
      // Ensure state is reverted if not already done by upsert catch
      if (JSON.stringify(get().lessonProgress[lessonId]) !== JSON.stringify(previousLessonState)) {
        console.log('Rollback: Restoring previous lesson progress state due to error.');
        set({ lessonProgress: previousLessonProgress });
      }
      set({ hasProgressError: true });
    }
  },

  /**
   * Load store product data
   * TODO: Implement actual fetching logic
   */
  loadStoreProducts: async (userId: string, filter?: { query?: string | null; collectionHandle?: string | null }, force?: boolean) => {
    if (!userId) return; // Should we fetch store products if no user? TBD

    const state = get();
    const now = Date.now();

    // Staleness check
    if (!force && state.lastStoreProductsLoadTime && (now - state.lastStoreProductsLoadTime < STALE_THRESHOLD)) {
      return; // Data is fresh
    }

    // Prevent concurrent fetches
    if (state.isLoadingStoreProducts) {
      return;
    }

    set({ isLoadingStoreProducts: true, hasStoreProductsError: false });

    try {
      // --- FETCHING LOGIC IMPLEMENTED --- 
      const supabase = getBrowserClient();

      // Type for the raw query result including nested variant price
      type ProductWithVariantPrice = Database['public']['Tables']['shopify_products']['Row'] & {
        shopify_product_variants: {
          price: number | string | null;
          compare_at_price?: number | string | null;
        }[];
      };

      let queryBuilder = supabase
        .from('shopify_products')
        .select(`
          id,
          title,
          handle,
          featured_image_url,
          collection_handles,
          shopify_product_variants (
            price,
            compare_at_price
          )
        `)
        .or('status.eq.ACTIVE,status.eq.active')
        .eq('vendor', 'Graceful Publications') // Filter by vendor: Student Store shows Publications
        .not('shopify_product_variants', 'is', null)
        .limit(1, { foreignTable: 'shopify_product_variants' }); // Fetch only one variant (assuming the primary one)

      // --- BEGIN LOGGING FILTERS ---
      let appliedFilterType = 'none';
      let appliedFilterValue: string | null = null;
      // --- END LOGGING FILTERS ---

      // Apply filters based on provided criteria
      if (filter?.collectionHandle && filter.collectionHandle !== 'all') {
        // --- LOGGING ---
        appliedFilterType = 'collection';
        appliedFilterValue = filter.collectionHandle;
        const filterCondition = `{"${filter.collectionHandle}"}`;

        // --- END LOGGING ---

        // Use contains filter for array column
        queryBuilder = queryBuilder.filter(
          'collection_handles',
          'cs', // array contains operator
          filterCondition // Use logged variable
        );
      } else if (filter?.query) {
        // --- LOGGING ---
        appliedFilterType = 'query';
        appliedFilterValue = filter.query;
        const filterCondition = `%${filter.query}%`;

        // --- END LOGGING ---

        queryBuilder = queryBuilder.ilike('title', filterCondition); // Use logged variable
      } else {

        appliedFilterType = 'all'; // Log that no specific filter applied
      }

      // --- LOGGING QUERY EXECUTION ---

      // --- END LOGGING ---

      const { data, error } = await queryBuilder.returns<ProductWithVariantPrice[]>();

      // --- LOGGING RAW RESULTS ---

      // --- END LOGGING ---

      if (error) {
        console.error('[Store Action] Error fetching store products:', error);
        throw error; // Throw error to be caught by the catch block
      }
      if (!data) {
        // Handle case where data is unexpectedly null/undefined after no error
        console.warn('[Store Action] No store products data returned, setting empty array.');
        set({
          storeProducts: [],
          isLoadingStoreProducts: false,
          lastStoreProductsLoadTime: Date.now(),
        });
        return;
      }

      // Transform data to ProductData format
      const products: ProductData[] = data
        .map((product: ProductWithVariantPrice): ProductData | null => {
          const variant = product.shopify_product_variants?.[0];

          if (!variant || variant.price === null || variant.price === undefined || isNaN(Number(variant.price))) {
            console.warn(`[Store Action] Product ${product.id} (${product.title}) skipped, missing variant or invalid price.`);
            return null;
          }

          let compareAtPrice: number | null = null;
          if (variant.compare_at_price !== null && variant.compare_at_price !== undefined) {
            const parsedCompareAtPrice = Number(variant.compare_at_price);
            if (!isNaN(parsedCompareAtPrice)) {
              compareAtPrice = parsedCompareAtPrice;
            }
          }

          return {
            id: product.id,
            title: product.title,
            handle: product.handle,
            featured_image_url: product.featured_image_url,
            price: Number(variant.price),
            compare_at_price: compareAtPrice,
          };
        })
        .filter((product): product is ProductData => product !== null);
      // ----------------------------------

      set({
        storeProducts: products,
        isLoadingStoreProducts: false,
        lastStoreProductsLoadTime: Date.now(),
      });
    } catch (error) {
      // Error already logged in the try block if it came from Supabase
      console.error('[Store Action] Final catch block for loadStoreProducts error.', error);
      set({
        isLoadingStoreProducts: false,
        hasStoreProductsError: true,
      });
    }
  },

  /**
   * Load store collection data
   * TODO: Implement actual fetching logic
   */
  loadStoreCollections: async (force?: boolean) => {
    const state = get();
    const now = Date.now();

    // Staleness check
    if (!force && state.lastStoreCollectionsLoadTime && (now - state.lastStoreCollectionsLoadTime < STALE_THRESHOLD)) {
      return; // Data is fresh
    }

    // Prevent concurrent fetches
    if (state.isLoadingStoreCollections) {
      return;
    }

    set({ isLoadingStoreCollections: true, hasStoreCollectionsError: false });

    try {
      // --- FETCHING LOGIC IMPLEMENTED ---
      const supabase = getBrowserClient();

      // Query for collection handles
      const { data, error } = await supabase
        .from('shopify_products')
        .select('collection_handles'); // Select the array column

      if (error) {
        console.error('[Store Action] Error fetching collection handles:', error);
        throw error; // Throw error to be caught by the catch block
      }
      if (!data) {
        console.warn('[Store Action] No collection handles data returned, setting empty array.');
        set({
          storeCollections: [],
          isLoadingStoreCollections: false,
          lastStoreCollectionsLoadTime: Date.now(),
        });
        return;
      }

      // Process the results to get unique handles
      // Need to handle potential nulls in collection_handles column
      const allHandles = data
        .flatMap(item => item.collection_handles || []) // Safely handle null arrays
        .filter((handle): handle is string => typeof handle === 'string' && handle.length > 0);
      const uniqueHandles = [...new Set(allHandles)];

      // Map to the StoreCollection format
      const collections: StoreCollection[] = uniqueHandles.map(handle => ({ handle }));
      // ----------------------------------

      set({
        storeCollections: collections,
        isLoadingStoreCollections: false,
        lastStoreCollectionsLoadTime: Date.now(),
      });
    } catch (error) {
      // Error already logged if from Supabase
      console.error('[Store Action] Final catch block for loadStoreCollections error.', error);
      set({
        isLoadingStoreCollections: false,
        hasStoreCollectionsError: true,
      });
    }
  },

  /**
   * Load sale product data
   * Fetches products where compare_at_price > price
   */
  loadSaleProducts: async (force?: boolean) => {
    const state = get();
    const now = Date.now();

    // Staleness check
    if (!force && state.lastSaleProductsLoadTime && (now - state.lastSaleProductsLoadTime < STALE_THRESHOLD)) {
      return; // Data is fresh
    }

    // Prevent concurrent fetches
    if (state.isLoadingSaleProducts) {
      return;
    }

    set({ isLoadingSaleProducts: true, hasSaleProductsError: false });

    try {
      // --- FETCHING LOGIC IMPLEMENTED (from original SaleSection) ---
      const supabase = getBrowserClient();

      // Type for the raw query result including nested variant price
      type ProductWithVariantPrice = Database['public']['Tables']['shopify_products']['Row'] & {
        shopify_product_variants: {
          id: string; // Need variant ID if multiple variants exist
          price: number | string | null;
          compare_at_price?: number | string | null;
        }[];
      };

      // Step 1: Find products with *any* variant having compare_at_price > price
      // We select the whole product and variants data here to avoid a second query
      const { data: potentialSaleProducts, error: fetchError } = await supabase
        .from('shopify_products')
        .select(`
          id,
          title,
          handle,
          featured_image_url,
          shopify_product_variants (
            id,
            price,
            compare_at_price
          )
        `)
        .or('status.eq.ACTIVE,status.eq.active')
        .not('shopify_product_variants', 'is', null) // Ensure variants exist
        .not('shopify_product_variants.compare_at_price', 'is', null); // Ensure compare_at_price exists
      // We filter for compare_at_price > price in the mapping step

      if (fetchError) {
        console.error('[Store Action] Error fetching potential sale products:', fetchError);
        throw fetchError;
      }

      if (!potentialSaleProducts) {
        console.warn('[Store Action] No potential sale products found, setting empty array.');
        set({ saleProducts: [], isLoadingSaleProducts: false, lastSaleProductsLoadTime: Date.now() });
        return;
      }

      // Step 2: Process and transform data
      const products: ProductData[] = [];

      for (const product of potentialSaleProducts as ProductWithVariantPrice[]) {
        if (!product.shopify_product_variants || product.shopify_product_variants.length === 0) {
          continue; // Skip products with no variants
        }

        let bestVariant = null;
        let bestDiscountPercentage = -1; // Use -1 to ensure any valid sale is picked initially

        for (const variant of product.shopify_product_variants) {
          if (variant.price === null || variant.price === undefined || isNaN(Number(variant.price)) ||
            variant.compare_at_price === null || variant.compare_at_price === undefined || isNaN(Number(variant.compare_at_price))) {
            continue; // Skip invalid variants
          }

          const price = Number(variant.price);
          const compareAtPrice = Number(variant.compare_at_price);

          if (compareAtPrice <= price) {
            continue; // Skip variants not on sale
          }

          const discountPercentage = (compareAtPrice - price) / compareAtPrice;

          if (discountPercentage > bestDiscountPercentage) {
            bestVariant = variant;
            bestDiscountPercentage = discountPercentage;
          }
        }

        if (bestVariant) {
          products.push({
            id: product.id,
            title: product.title,
            handle: product.handle,
            featured_image_url: product.featured_image_url,
            price: Number(bestVariant.price),
            compare_at_price: Number(bestVariant.compare_at_price),
          });
        }
      }

      // Step 3: Sort by discount percentage (highest first)
      products.sort((a, b) => {
        // Ensure prices exist for sorting
        const priceA = a.price;
        const compareA = a.compare_at_price;
        const priceB = b.price;
        const compareB = b.compare_at_price;

        if (!compareA || !compareB) return 0; // Should not happen if filtered correctly, but safety check

        const discountA = (compareA - priceA) / compareA;
        const discountB = (compareB - priceB) / compareB;

        return discountB - discountA; // Descending order of discount
      });
      // ----------------------------------

      set({
        saleProducts: products, // Set fetched products (could be empty)
        isLoadingSaleProducts: false,
        lastSaleProductsLoadTime: Date.now(),
      });

    } catch (error) {
      console.error('[Store Action] Final catch block for loadSaleProducts error:', error);
      set({
        isLoadingSaleProducts: false,
        hasSaleProductsError: true,
      });
    }
  },

  /**
   * Fetch purchase history with caching based on staleness
   */
  loadPurchases: async (userId: string, force = false) => {
    const { lastPurchasesLoadTime, purchases, isLoadingPurchases } = get() as StudentDashboardStore;

    // Prevent simultaneous calls
    if (isLoadingPurchases) {
      return;
    }

    if (!force && purchases.length > 0 && lastPurchasesLoadTime && Date.now() - lastPurchasesLoadTime < STALE_THRESHOLD) {
      return;
    }

    // trigger loading state
    set({ isLoadingPurchases: true, hasPurchasesError: false });

    try {
      const data = await fetchPurchaseHistory(userId);

      const purchasesToSet = data ?? [];
      set({ purchases: purchasesToSet });
      set({ lastPurchasesLoadTime: Date.now() });

    } catch (error) {
      console.error('[Store Action] loadPurchases error:', error);
      set({ hasPurchasesError: true });
    } finally {
      set({ isLoadingPurchases: false });
    }
  },

  /**
   * Simple Setters
   */

  setUserId: (userId: string | null) => set({ userId }),
  setUserProfile: (profile: StudentDashboardStore['userProfile']) => set({ userProfile: profile }),

  // Enrollment setters
  setEnrollments: (enrollments: UserEnrollment[]) => set({ enrollments, lastEnrollmentsLoadTime: Date.now() }),
  setIsLoadingEnrollments: (isLoading: boolean) => set({ isLoadingEnrollments: isLoading }),
  setHasEnrollmentError: (hasError: boolean) => set({ hasEnrollmentError: hasError }),

  // Progress setters
  // Note: These might need adjustments based on how progress is structured (objects vs arrays)
  setCourseProgress: (courseId: string, progress: UICourseProgress) => set(state => ({ courseProgress: { ...state.courseProgress, [courseId]: progress } })),
  setModuleProgress: (courseId: string, progress: UIModuleProgress[]) => set(state => ({ moduleProgress: { ...state.moduleProgress, [courseId]: progress } })),
  setLessonProgress: (lessonId: string, progress: UILessonProgress) => set(state => ({ lessonProgress: { ...state.lessonProgress, [lessonId]: progress } })),
  setContinueLearningLesson: (lesson: ContinueLearningLesson | null) => set({ continueLearningLesson: lesson, lastContinueLearningLessonLoadTime: Date.now() }),
  setIsLoadingProgress: (isLoading: boolean) => set({ isLoadingProgress: isLoading }),
  setHasProgressError: (hasError: boolean) => set({ hasProgressError: hasError }),
  setIsLoadingContinueLearningLesson: (isLoading: boolean) => set({ isLoadingContinueLearningLesson: isLoading }),

  // Templates setters (Deprecated? Based on loadUserDashboardData comment)
  // setTemplates: (templates: Template[]) => set({ templates }),
  // setSelectedTemplateId: (templateId: string | null) => set({ selectedTemplateId: templateId }),
  // setTemplateFilter: (filter: string) => set({ templateFilter: filter }),
  // setTemplateSearchQuery: (query: string) => set({ templateSearchQuery: query }),
  // setIsLoadingTemplates: (isLoading: boolean) => set({ isLoadingTemplates: isLoading }),
  // setHasTemplatesError: (hasError: boolean) => set({ hasTemplatesError: hasError }),

  // Purchases setters
  setPurchases: (purchases: any[]) => set({ purchases, lastPurchasesLoadTime: Date.now() }),
  setIsLoadingPurchases: (isLoading: boolean) => set({ isLoadingPurchases: isLoading }),
  setHasPurchasesError: (hasError: boolean) => set({ hasPurchasesError: hasError }),

  // Live classes setters (Assuming similar structure if implemented)
  // setLiveClasses: (classes: LiveClass[]) => set({ liveClasses }),
  // setIsLoadingLiveClasses: (isLoading: boolean) => set({ isLoadingLiveClasses: isLoading }),
  // setHasLiveClassesError: (hasError: boolean) => set({ hasLiveClassesError: hasError }),

  // ADDED: Store Products setters
  setStoreProducts: (products: ProductData[]) => set({ storeProducts: products, lastStoreProductsLoadTime: Date.now() }),
  setIsLoadingStoreProducts: (isLoading: boolean) => set({ isLoadingStoreProducts: isLoading }),
  setHasStoreProductsError: (hasError: boolean) => set({ hasStoreProductsError: hasError }),

  // ADDED: Store Collections setters
  setStoreCollections: (collections: StoreCollection[]) => set({ storeCollections: collections, lastStoreCollectionsLoadTime: Date.now() }),
  setIsLoadingStoreCollections: (isLoading: boolean) => set({ isLoadingStoreCollections: isLoading }),
  setHasStoreCollectionsError: (hasError: boolean) => set({ hasStoreCollectionsError: hasError }),

  // ADDED: Sale Products setters
  setSaleProducts: (products: ProductData[]) => set({ saleProducts: products, lastSaleProductsLoadTime: Date.now() }),
  setIsLoadingSaleProducts: (isLoading: boolean) => set({ isLoadingSaleProducts: isLoading }),
  setHasSaleProductsError: (hasError: boolean) => set({ hasSaleProductsError: hasError }),

  /**
   * Load announcements with pagination and filtering
   * Uses SWR pattern with timestamp-based caching
   */
  loadAnnouncements: async (page = 1, limit = 10, filter: { type?: string } = {}, force = false) => {
    const { announcements, lastAnnouncementsLoadTime } = get();

    // Check if we have data and it's not stale, unless force refresh is requested
    if (!force && announcements.length > 0 && lastAnnouncementsLoadTime &&
      Date.now() - lastAnnouncementsLoadTime < STALE_THRESHOLD) {
      return;
    }

    set({ isLoadingAnnouncements: true, hasAnnouncementsError: false });

    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Add type filter if provided
      if (filter.type) {
        params.append('type', filter.type);
      }

      // Fetch announcements from API
      const response = await fetch(`/api/announcements?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch announcements: ${response.status}`);
      }

      const data = await response.json();

      // Update state with fetched announcements
      set({
        announcements: data.data || [],
        lastAnnouncementsLoadTime: Date.now()
      });
    } catch (error) {
      console.error('[Store Action] loadAnnouncements error:', error);
      set({ hasAnnouncementsError: true });
    } finally {
      set({ isLoadingAnnouncements: false });
    }
  },

  // UI actions
  setShowWelcomeModal: (show: boolean) => set({ showWelcomeModal: show }),
  setShowOnboarding: (show: boolean) => set({ showOnboarding: show }),
  setShowAnnouncement: (show: boolean) => set({ showAnnouncement: show }),
  toggleSection: (section: string) => {
    set((state) => ({
      expandedSections: {
        ...state.expandedSections,
        [section]: !state.expandedSections[section],
      },
    }));
  },

  // Utility functions (Consider moving selectors to separate hooks for better performance)
  getFilteredTemplates: () => {
    // Deprecated: templates loading seems removed
    // const { templates, templateFilter, templateSearchQuery } = get();
    // let filtered = templates;
    // // ... filtering logic ...
    // return filtered;
    return [];
  },
  getSelectedTemplate: () => {
    // Deprecated
    // const { templates, selectedTemplateId } = get();
    // return templates.find(t => t.id === selectedTemplateId) || null;
    return null;
  },
  getContinueLearningLesson: () => {
    // This seems redundant - state.continueLearningLesson is directly accessible
    return get().continueLearningLesson;
  },

  /**
   * Fetches the user context (roles, basic profile info) from the API.
   * It checks if the data is stale before making a new request.
   */
  fetchUserContext: async (forceRefresh = false) => {
    const { userContext, lastUserContextLoadTime, userContextLoading } = get();

    // Prevent re-fetch if already loading
    if (userContextLoading) {
      return;
    }

    // Check if data is fresh and not forcing a refresh
    if (
      !forceRefresh &&
      userContext &&
      lastUserContextLoadTime &&
      Date.now() - lastUserContextLoadTime < STALE_THRESHOLD
    ) {
      return;
    }

    set({ userContextLoading: true, userContextError: null });

    try {
      const response = await fetch('/api/user/context');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `Failed to fetch user context: ${response.status}`);
      }

      const data: UserContextData = await response.json();

      set({
        userContext: data,
        lastUserContextLoadTime: Date.now(),
      });
    } catch (error) {
      console.error('[Store Action] fetchUserContext error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      set({ userContextError: errorMessage });
    } finally {
      set({ userContextLoading: false });
    }
  },

});

// Export the types if needed elsewhere, though they are defined in ./types/index.ts
export type { UserEnrollment, UICourseProgress, UIModuleProgress, UILessonProgress, ContinueLearningLesson, ProductData, StoreCollection };
