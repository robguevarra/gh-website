import { toast } from '@/components/ui/use-toast';
import type { StoreApi } from 'zustand';
import type { CourseStore, ExtendedModule, Lesson, ModuleItem } from '../types';
import { validateLessonUpdate } from '../utils/validation';
import { cacheManager } from '../utils/cache';

export const createLessonActions = (set: StoreApi<CourseStore>['setState'], get: () => CourseStore) => ({
  updateLesson: async (lessonId: string, data: Partial<Lesson>) => {
    console.log('🔄 [Lesson] Starting update:', { lessonId, data });
    
    const state = get();
    const { course } = state;
    
    if (!course) {
      throw new Error('No course loaded');
    }

    // Find the module containing this lesson
    const module = course.modules?.find(m => m.lessons?.some(l => l.id === lessonId));
    if (!module) {
      throw new Error('Lesson not found in any module');
    }

    try {
      // Start optimistic update immediately
      const optimisticModules = course.modules?.map(m => {
        if (m.id === module.id) {
          const updatedLessons = m.lessons?.map(l => 
            l.id === lessonId 
              ? { ...l, ...data }
              : l
          ) || [];

          return {
            ...m,
            lessons: updatedLessons,
            items: updatedLessons.map(lesson => ({
              id: lesson.id,
              title: lesson.title, // This ensures item title stays in sync
              type: (lesson.metadata?.type || 'lesson') as ModuleItem['type'],
              duration: Number(lesson.metadata?.duration) || 0,
              content: lesson.content_json?.content || '',
              content_json: lesson.content_json
            }))
          } as ExtendedModule;
        }
        return m;
      }) || [];

      // Apply optimistic update in a single state change
      set({
        course: { ...course, modules: optimisticModules },
        modules: optimisticModules,
        pendingSave: true,
        error: null,
        savedState: 'saving'
      });
      
      // Validate data before API call
      if (data.content_json && typeof data.content_json.content !== 'string') {
        throw new Error('Invalid content format');
      }

      // Cache the update request
      const cacheKey = `lesson-update-${lessonId}`;
      const cachedPromise = cacheManager.get(cacheKey);
      if (cachedPromise) {
        await cachedPromise;
      }

      console.log('📤 [Lesson] Sending update request:', {
        courseId: course.id,
        moduleId: module.id,
        lessonId,
        data
      });

      // Make API call with debounced request
      const updatePromise = fetch(`/api/courses/${course.id}/modules/${module.id}/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(data),
      });

      // Cache the promise
      cacheManager.set(cacheKey, updatePromise, 5000); // Cache for 5 seconds

      const response = await updatePromise;

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [Lesson] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error?.message || 'Failed to update lesson');
      }

      const updatedLesson = await response.json() as Lesson;
      console.log('✅ [Lesson] Update successful:', { lessonId, updatedLesson });

      // Update final state with server response
      const finalModules = course.modules?.map(m => {
        if (m.id === module.id) {
          const updatedLessons = m.lessons?.map(l => 
            l.id === lessonId 
              ? { ...l, ...updatedLesson }
              : l
          ) || [];

          return {
            ...m,
            lessons: updatedLessons,
            items: updatedLessons.map(lesson => ({
              id: lesson.id,
              title: lesson.title,
              type: (lesson.metadata?.type || 'lesson') as ModuleItem['type'],
              duration: Number(lesson.metadata?.duration) || 0,
              content: lesson.content_json?.content || '',
              content_json: lesson.content_json
            }))
          } as ExtendedModule;
        }
        return m;
      }) || [];

      // Single state update with final data
      set({
        course: { ...course, modules: finalModules },
        modules: finalModules,
        pendingSave: false,
        lastSaveTime: new Date().toISOString(),
        error: null,
        savedState: 'saved'
      });

      console.log('✅ [Lesson] Successfully updated:', { lessonId });
      return updatedLesson;
    } catch (error) {
      console.error('❌ [Lesson] Update failed:', error);
      
      // Revert to original state on error
      set({ 
        course: { ...course },
        modules: course.modules || [],
        error: error instanceof Error ? error.message : 'Failed to update lesson',
        pendingSave: false,
        savedState: 'unsaved'
      });
      
      throw error;
    }
  },

  reorderLesson: async (lessonId: string, newPosition: number) => {
    const course = get().course;
    if (!course) return;

    const module = course.modules?.find(m => m.lessons?.some(l => l.id === lessonId));
    if (!module?.lessons) return;

    const lessons = [...module.lessons];
    const movedLesson = lessons.find(l => l.id === lessonId);
    if (!movedLesson) return;

    const oldPosition = movedLesson.position;
    movedLesson.position = newPosition;

    try {
      set({ isLoading: true, error: null });
      await Promise.all(
        lessons.map((lesson) =>
          fetch(`/api/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              position: lesson.position,
              updated_at: new Date().toISOString()
            }),
          })
        )
      );

      await get().fetchCourse(course.id);
      toast({
        title: 'Success',
        description: `Lesson moved from position ${oldPosition} to ${newPosition}`,
      });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, isLoading: false });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  },

  addContent: async (courseId: string, moduleId: string, type: string) => {
    const { modules } = get();
    console.log('➕ [Store] Adding new content:', { courseId, moduleId, type });
    
    set({ isLoading: true, error: null, savedState: 'saving' });
    
    try {
      // Create optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticContent: Lesson = {
        id: tempId,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type: type as ModuleItem['type'],
        duration: 0,
        content: `<p>New ${type} content goes here</p>`,
        content_json: {
          content: `<p>New ${type} content goes here</p>`,
          type: 'html',
          version: 1
        }
      };

      // Store the pending operation
      const operationPromise = (async () => {
        try {
          // Apply optimistic update
          set(state => ({
            modules: state.modules.map(m => 
              m.id === moduleId 
                ? { ...m, items: [...(m.items || []), optimisticContent] }
                : m
            )
          }));

          // Make API call
          const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: optimisticContent.title,
              content_json: optimisticContent.content_json,
              status: 'draft',
              description: null,
              is_preview: false,
              metadata: {
                type: type
              }
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create content');
          }

          const newContent = await response.json();
          
          // Update with real data
          set(state => ({
            modules: state.modules.map(m => 
              m.id === moduleId 
                ? {
                    ...m,
                    items: (m.items || []).map(item => 
                      item.id === tempId 
                        ? {
                            id: newContent.id,
                            title: newContent.title,
                            type: type as ModuleItem['type'],
                            duration: 0,
                            content: newContent.content_json?.content || '',
                            content_json: newContent.content_json
                          }
                        : item
                    )
                  }
                : m
            ),
            selectedLessonId: newContent.id,
            isLoading: false,
            error: null,
            savedState: 'saved'
          }));

          return newContent;
        } finally {
          get().pendingOperations.delete(tempId);
        }
      })();

      get().pendingOperations.set(tempId, operationPromise);
      const result = await operationPromise;

      // Ensure module is expanded
      set(state => ({
        expandedModules: new Set([...state.expandedModules, moduleId])
      }));
      
      toast({
        title: 'Success',
        description: `New ${type} added successfully`,
      });

      return result;
    } catch (error) {
      // Rollback optimistic update
      set(state => ({
        modules: state.modules.map(m => 
          m.id === moduleId 
            ? { ...m, items: m.items?.filter(item => !item.id.startsWith('temp-')) || [] }
            : m
        ),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to add content',
        savedState: 'saved'
      }));

      toast({
        title: 'Error adding content',
        description: error instanceof Error ? error.message : 'Failed to add content',
        variant: 'destructive',
      });
      throw error;
    }
  }
}); 