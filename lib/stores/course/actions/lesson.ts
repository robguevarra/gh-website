import { ExtendedModule } from '../types/module';
import { StoreApi } from 'zustand';
import type { CourseStore as CourseStoreType } from '../types/store';
import { Lesson } from '../types/lesson';

export const createLessonActions = (set: StoreApi<CourseStoreType>['setState'], get: () => CourseStoreType) => ({
  /**
   * Update a lesson with new data
   *
   * @param lessonId - The ID of the lesson to update
   * @param data - The data to update the lesson with
   * @returns Promise that resolves when the update is complete
   */
  updateLesson: async (lessonId: string, data: Partial<Lesson>) => {
    console.log('🔄 [Lesson] Starting update:', { lessonId, data });

    const { course } = get();
    if (!course?.modules) {
      console.error('❌ [Lesson] No course loaded');
      throw new Error('No course loaded');
    }

    // Find module containing the lesson
    const module = course.modules.find(m =>
      m.lessons?.some(l => l.id === lessonId)
    );

    if (!module) {
      console.error('❌ [Lesson] Lesson not found in any module:', { lessonId, moduleIds: course.modules.map(m => m.id) });
      throw new Error('Lesson not found in any module');
    }

    // Log more detailed information for debugging
    console.log('🔍 [Lesson] Found lesson in module:', {
      moduleId: module.id,
      lessonId,
      inLessonsArray: module.lessons?.some(l => l.id === lessonId)
    });

    try {
      // Apply optimistic update first
      set((state) => {
        if (!state.course?.modules) return state;

        const updatedModules = state.course.modules.map((m) =>
          m.id === module.id
            ? {
                ...m,
                lessons: (m.lessons || []).map((lesson) =>
                  lesson.id === lessonId
                    ? {
                        ...lesson,
                        ...data,
                        content_json: {
                          content: data.content_json?.content || lesson.content_json?.content || '',
                          type: data.content_json?.type || lesson.content_json?.type || 'html',
                          version: (lesson.content_json?.version || 0) + 1
                        }
                      }
                    : lesson
                )
              }
            : m
        ) as ExtendedModule[];

        return {
          ...state,
          course: {
            ...state.course,
            modules: updatedModules
          },
          modules: updatedModules,
          savedState: 'saving'
        };
      });

      // Prepare update data
      const updatePayload = {
        ...data,
        module_id: module.id,
        updated_at: new Date().toISOString(),
        content_json: {
          content: data.content_json?.content || '',
          type: 'lesson',
          version: ((module.lessons?.find(l => l.id === lessonId)?.content_json?.version || 0) + 1)
        }
      };

      // Log the update request
      console.log('📤 [Lesson] Sending update request:', {
        lessonId,
        moduleId: module.id,
        version: updatePayload.content_json.version
      });

      // Make API call with proper endpoint following Next.js 13+ conventions
      const response = await fetch(`/api/courses/${course.id}/modules/${module.id}/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error('Failed to update lesson');
      }

      const updatedLesson = await response.json();
      console.log('✅ [Lesson] Update successful:', updatedLesson);

      // Update state with server response
      set(state => {
        if (!state.course?.modules) return state;

        const updatedModules = state.course.modules.map(m =>
          m.id === module.id
            ? {
                ...m,
                lessons: (m.lessons || []).map(l =>
                  l.id === lessonId
                    ? { ...l, ...updatedLesson }
                    : l
                )
              }
            : m
        ) as ExtendedModule[];

        return {
          ...state,
          course: {
            ...state.course,
            modules: updatedModules
          },
          modules: updatedModules,
          savedState: 'saved',
          lastSaveTime: new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('❌ [Lesson] Update failed:', error);
      set(state => ({
        ...state,
        savedState: 'unsaved',
        error: error instanceof Error ? error.message : 'Failed to update lesson'
      }));
      throw error;
    }
  },

  /**
   * Reorder a lesson within its module
   *
   * @param lessonId - The ID of the lesson to reorder
   * @param newPosition - The new position for the lesson
   * @returns Promise that resolves when the reordering is complete
   */
  reorderLesson: async (lessonId: string, newPosition: number) => {
    console.log('🔄 [Lesson] Reordering lesson:', { lessonId, newPosition });

    const { course } = get();
    if (!course?.modules) {
      console.error('❌ [Lesson] No course loaded');
      throw new Error('No course loaded');
    }

    // Find module containing the lesson
    const module = course.modules.find(m =>
      m.lessons?.some(l => l.id === lessonId)
    );

    if (!module) {
      console.error('❌ [Lesson] Lesson not found in any module:', { lessonId });
      throw new Error('Lesson not found in any module');
    }

    // Get the lessons from the module
    const lessons = [...(module.lessons || [])];
    const lessonIndex = lessons.findIndex(l => l.id === lessonId);

    if (lessonIndex === -1) {
      console.error('❌ [Lesson] Lesson not found in module:', { lessonId, moduleId: module.id });
      throw new Error('Lesson not found in module');
    }

    // Move the lesson to the new position
    const [movedLesson] = lessons.splice(lessonIndex, 1);
    lessons.splice(newPosition, 0, movedLesson);

    // Update positions for all lessons
    lessons.forEach((lesson, index) => {
      lesson.position = index;
    });

    try {
      // Apply optimistic update
      set((state) => {
        if (!state.course?.modules) return state;

        const updatedModules = state.course.modules.map((m) =>
          m.id === module.id
            ? { ...m, lessons: lessons }
            : m
        ) as ExtendedModule[];

        return {
          ...state,
          course: {
            ...state.course,
            modules: updatedModules
          },
          modules: updatedModules,
          savedState: 'saving'
        };
      });

      // Make API call to reorder lessons
      const response = await fetch(`/api/courses/${course.id}/modules/${module.id}/lessons/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonOrder: lessons.map((lesson, index) => ({
            id: lesson.id,
            position: index,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder lessons');
      }

      // Update state with success
      set({
        savedState: 'saved',
        lastSaveTime: new Date().toISOString()
      });

      console.log('✅ [Lesson] Reordering successful');
    } catch (error) {
      console.error('❌ [Lesson] Reordering failed:', error);

      // Revert to original state
      set((state) => ({
        ...state,
        savedState: 'unsaved',
        error: error instanceof Error ? error.message : 'Failed to reorder lesson'
      }));

      throw error;
    }
  },

  /**
   * Add a new content item (lesson, quiz, video, etc.) to a module
   *
   * @param courseId - The ID of the course
   * @param moduleId - The ID of the module to add content to
   * @param type - The type of content to add ('lesson', 'quiz', 'video', 'assignment')
   * @param title - The title for the new content
   * @returns Promise with the newly created content
   */
  addContent: async (courseId: string, moduleId: string, type: string, title: string) => {
    console.log('➕ [Store] Adding new content:', { courseId, moduleId, type, title });

    // Create a separate loading flag specifically for content creation
    // Don't set isLoading: true as that will trigger the main loading screen
    set({ error: null, savedState: 'saving' });

    try {
      // Make API call to create the lesson with the provided title
      console.log('📤 [Store] Creating new lesson:', { courseId, moduleId, type, title });

      const response = await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          content_json: {
            content: `<p>New ${type} content goes here</p>`,
            type: 'html',
            version: 1
          },
          status: 'draft',
          description: '',
          is_preview: false,
          metadata: {
            type: type
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create content');
      }

      const newContent = await response.json();
      console.log('✅ [Store] Lesson created successfully:', { newContent });

      // Update the UI with the new lesson
      // Create the new lesson object with all required fields
      const newLesson = {
        ...newContent,
        content: newContent.content_json?.content || '',
        module_id: moduleId,
        metadata: {
          ...newContent.metadata,
          type: type as 'video' | 'lesson' | 'quiz' | 'assignment'
        }
      };

      // Update the UI with the new lesson - use a simpler update that won't trigger a full reload
      set(state => {
        // Find the module to update
        const moduleToUpdate = state.modules.find(m => m.id === moduleId);
        if (!moduleToUpdate) {
          console.warn('⚠️ [Store] Module not found for adding lesson:', moduleId);
          return state;
        }

        // Create updated modules array
        const updatedModules = state.modules.map(m =>
          m.id === moduleId
            ? {
                ...m,
                lessons: [...m.lessons, newLesson]
              }
            : m
        );

        // Create updated course object if it exists
        const updatedCourse = state.course
          ? {
              ...state.course,
              modules: state.course.modules?.map(m =>
                m.id === moduleId
                  ? {
                      ...m,
                      lessons: [...(m.lessons || []), newLesson]
                    }
                  : m
              )
            }
          : null;

        // Log the update for debugging
        console.log('💾 [Store] Updated state with new lesson:', {
          lessonId: newContent.id,
          moduleId,
          lessonCount: moduleToUpdate.lessons.length + 1
        });

        // Return the updated state - preserve isLoading value
        return {
          ...state,
          modules: updatedModules,
          course: updatedCourse,
          selectedLessonId: newContent.id,
          error: null,
          savedState: 'saved',
          expandedModules: new Set([...state.expandedModules, moduleId])
        };
      });

      // No need to refresh the course - we've already updated the state properly

      return newContent;
    } catch (error) {
      console.error('❌ [Store] Failed to create lesson:', error);

      set({
        error: error instanceof Error ? error.message : 'Failed to add content',
        savedState: 'unsaved'
      });

      throw error;
    }
  }
});