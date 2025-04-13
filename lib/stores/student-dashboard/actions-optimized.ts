/**
 * Optimized version of the loadContinueLearningLesson function
 * to prevent duplicate loading
 */
export const createOptimizedActions = (
  set: any,
  get: any
) => ({
  /**
   * Load continue learning lesson with optimizations to prevent duplicate loading
   */
  loadContinueLearningLesson: async (userId: string) => {
    if (!userId) {
      set({ continueLearningLesson: null });
      return;
    }

    // Get current state
    const state = get();
    
    // Check if we're already loading
    if (state.isLoadingContinueLearningLesson) {
      return;
    }
    
    // Check if we've loaded recently (within the last 10 seconds)
    const now = Date.now();
    if (
      state.lastContinueLearningLessonLoadTime && 
      now - state.lastContinueLearningLessonLoadTime < 10000
    ) {
      return;
    }
    
    // Set loading flag and timestamp
    set({ 
      isLoadingContinueLearningLesson: true,
      lastContinueLearningLessonLoadTime: now
    });

    try {
      // Use browser client for client-side data fetching
      const supabase = getBrowserClient();

      // Get the most recent lesson the user was working on with proper joins
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
              course_id,
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

      if (error) throw error;

      // Get the most recent lesson
      const recentLesson = data?.[0];

      // Add defensive checks for the data structure
      if (recentLesson?.lesson?.module?.course_id &&
          recentLesson.lesson.id &&
          recentLesson.lesson.title) {

        // Create continue learning data with proper type safety
        const continueLearningData = {
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
  }
});
