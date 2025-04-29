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
import { type StudentDashboardStore, type ProductData, type StoreCollection } from './index';
import { getBrowserClient } from '@/lib/supabase/client';
import * as auth from '@/lib/supabase/auth';
import type { Database } from '@/types/supabase';
import type {
  UICourseProgress,
  UIModuleProgress,
  UILessonProgress,
  ContinueLearningLesson
} from './types/index';
import { useStudentDashboardStore } from './index';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UserEnrollment,
} from './types/index';

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

      // TECH DEBT: This action currently queries the legacy `profiles` table.
      // See ProjectDocs/Build_Notes/active/tech-debt_refactor-useuserprofile-hook.md
      // The long-term solution is to migrate to `unified_profiles`, but for now,
      // we adapt to the `profiles` table structure. Assuming first_name/last_name exist.
      const profileName = profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.first_name || profile.last_name || user.email?.split('@')[0] || 'User';

      // Set the user profile in the store
      set({
        userProfile: {
          name: profileName, // Use combined or fallback name
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
    console.log(`[Store Action] loadUserDashboardData called. UserID: ${userId}, Force: ${force}`); // Log entry
    if (!userId) return;

    const store = get() as StudentDashboardStore;

    try {
      // Load data in parallel for better performance, passing down 'force' flag.
      // ADDED: loadStoreProducts and loadStoreCollections to the initial load
      await Promise.all([
        store.loadUserEnrollments(userId, force),
        store.loadUserProgress(userId, force),
        store.loadStoreProducts(userId, undefined, force), // Pass userId, no specific filter, respect force flag
        store.loadStoreCollections(force) // Respect force flag
        // Note: loadUserTemplates is deprecated and a no-op
      ]);
      console.log('[Store Action] loadUserDashboardData: All parallel fetches initiated.');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set general error flags if orchestration fails
      set({
        hasEnrollmentError: true,
        hasProgressError: true,
        hasStoreProductsError: true, // ADDED
        hasStoreCollectionsError: true // ADDED
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

      // Fetch user enrollments with related course data
      const { data: enrollments, error } = await supabase
        .from('user_enrollments')
        .select(
          `
            *,
            courses (
              id,
              title,
              description,
              slug
            )
          `,
        )
        .eq('user_id', userId);

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

      // Format and set enrollments by explicitly mapping fields
      const formattedEnrollments: UserEnrollment[] = enrollments.map(
        (enrollment) => {
          // Safely access nested course properties
          // Removed cast 'as UserEnrollment['course']'
          const courseObject = enrollment.courses;
          const courseData = courseObject && typeof courseObject === 'object' 
            ? {
                id: courseObject.id,
                title: courseObject.title,
                description: courseObject.description ?? '',
                slug: courseObject.slug,
              }
            : undefined;

          return {
            id: enrollment.id,
            userId: enrollment.user_id,
            courseId: enrollment.course_id,
            enrolledAt: enrollment.enrolled_at ?? '',
            expiresAt: enrollment.expires_at,
            status: enrollment.status as UserEnrollment['status'], // Cast status
            paymentId: enrollment.payment_id,
            createdAt: enrollment.created_at ?? '',
            updatedAt: enrollment.updated_at ?? '',
            course: courseData, // Assign the potentially partial course data
          };
        },
      );

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
          course: courses (
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
        console.log(`[Store Action] Applying collection filter: collection_handles cs ${filterCondition}`);
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
        console.log(`[Store Action] Applying search filter: title ilike ${filterCondition}`);
        // --- END LOGGING ---

        queryBuilder = queryBuilder.ilike('title', filterCondition); // Use logged variable
      } else {
        console.log('[Store Action] Fetching all active products (no filter).');
        appliedFilterType = 'all'; // Log that no specific filter applied
      }

      // --- LOGGING QUERY EXECUTION ---
      console.log(`[Store Action] Executing query with filter type: ${appliedFilterType}, value: ${appliedFilterValue}`);
      // --- END LOGGING ---

      const { data, error } = await queryBuilder.returns<ProductWithVariantPrice[]>();

      // --- LOGGING RAW RESULTS ---
      console.log('[Store Action] Raw Supabase response:', { data: data ? `(${data.length} items)` : data, error });
      if (data && data.length > 0) {
        console.log('[Store Action] First raw item:', data[0]); // Log first item for structure inspection
      }
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

  // ----- Simple Setters ----- 

  setUserId: (userId: string | null) => set({ userId }),
  setUserProfile: (profile: StudentDashboardStore['userProfile']) => set({ userProfile: profile }),

  // Enrollment setters
  setEnrollments: (enrollments: UserEnrollment[]) => set({ enrollments, lastEnrollmentsLoadTime: Date.now() }),
  setIsLoadingEnrollments: (isLoading: boolean) => set({ isLoadingEnrollments: isLoading }),
  setHasEnrollmentError: (hasError: boolean) => set({ hasEnrollmentError: hasError }),

  // Progress setters
  // Note: These might need adjustments based on how progress is structured (objects vs arrays)
  setCourseProgress: (courseId: string, progress: UICourseProgress) => set(state => ({ courseProgress: { ...state.courseProgress, [courseId]: progress }})), 
  setModuleProgress: (courseId: string, progress: UIModuleProgress[]) => set(state => ({ moduleProgress: { ...state.moduleProgress, [courseId]: progress }})),
  setLessonProgress: (lessonId: string, progress: UILessonProgress) => set(state => ({ lessonProgress: { ...state.lessonProgress, [lessonId]: progress }})),
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

  // Purchases setters (Assuming similar structure if implemented)
  // setPurchases: (purchases: Purchase[]) => set({ purchases }),
  // setIsLoadingPurchases: (isLoading: boolean) => set({ isLoadingPurchases: isLoading }),
  // setHasPurchasesError: (hasError: boolean) => set({ hasPurchasesError: hasError }),

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

});

// Export the types if needed elsewhere, though they are defined in ./types/index.ts
export type { UserEnrollment, UICourseProgress, UIModuleProgress, UILessonProgress, ContinueLearningLesson, ProductData, StoreCollection };
