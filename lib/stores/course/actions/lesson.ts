import { Course } from '@/types/course';
import { ExtendedModule } from '../types/module';
import { CourseStore, ModuleItem } from '../types/store';
import { StoreApi } from 'zustand';
import type { CourseStore as CourseStoreType } from '../types/store';
import { validateLessonUpdate } from '../utils/validation';
import { cacheManager } from '../utils/cache';
import { ExtendedModule as ExtendedModuleType } from '../types/module';

// Define Lesson type
interface Lesson {
  id: string;
  title: string;
  description?: string;
  content?: string;
  content_json?: {
    content: string;
    type?: string;
    version?: number;
  };
  module_id: string;
  updated_at: string;
}

export const createLessonActions = (set: StoreApi<CourseStoreType>['setState'], get: () => CourseStoreType) => ({
  updateLesson: async (lessonId: string, data: Partial<ModuleItem>) => {
    console.log('🔄 [Lesson] Starting update:', { lessonId, data });

    const { course } = get();
    if (!course?.modules) {
      console.error('❌ [Lesson] No course loaded');
      throw new Error('No course loaded');
    }

    // Find module containing the lesson
    const module = course.modules.find(m => 
      m.lessons?.some(l => l.id === lessonId) || 
      m.items?.some(item => item.id === lessonId)
    );

    if (!module) {
      console.error('❌ [Lesson] Lesson not found in any module');
      throw new Error('Lesson not found in any module');
    }

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
                        content: data.content_json?.content || lesson.content,
                        content_json: {
                          content: data.content_json?.content || lesson.content_json?.content || '',
                          type: 'lesson',
                          version: (lesson.content_json?.version || 0) + 1
                        }
                      }
                    : lesson
                ),
                items: (m.items || []).map((item) =>
                  item.id === lessonId
                    ? {
                        ...item,
                        content: data.content_json?.content || item.content,
                        content_json: {
                          content: data.content_json?.content || item.content_json?.content || '',
                          type: 'lesson',
                          version: (item.content_json?.version || 0) + 1
                        }
                      }
                    : item
                )
              }
            : m
        );

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
      const response = await fetch(`/api/admin/courses/${course.id}/lessons/${lessonId}`, {
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
                ),
                items: (m.items || []).map(item =>
                  item.id === lessonId
                    ? {
                        ...item,
                        content: updatedLesson.content_json?.content || item.content,
                        content_json: updatedLesson.content_json
                      }
                    : item
                )
              }
            : m
        );

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
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  addContent: async (courseId: string, moduleId: string, type: string) => {
    const { modules } = get();
    console.log('➕ [Store] Adding new content:', { courseId, moduleId, type });
    
    set({ isLoading: true, error: null, savedState: 'saving' });
    
    try {
      // Create optimistic update with a proper temporary ID format
      const tempId = `temp_${type}_${Date.now()}`;
      const optimisticContent = {
        id: tempId,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type: type as ModuleItem['type'],
        duration: 0,
        content: `<p>New ${type} content goes here</p>`,
        content_json: {
          content: `<p>New ${type} content goes here</p>`,
          type: 'html',
          version: 1
        },
        status: 'draft',
        is_preview: false,
        description: null,
        metadata: {
          type: type
        }
      };

      // Apply optimistic update
      set(state => ({
        modules: state.modules.map(m => 
          m.id === moduleId 
            ? { ...m, items: [...(m.items || []), optimisticContent] }
            : m
        ),
        selectedLessonId: tempId // Select the new content immediately
      }));

      console.log('📤 [Store] Creating new lesson:', {
        courseId,
        moduleId,
        type,
        tempId
      });

      // Make API call to create the lesson
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: optimisticContent.title,
          content_json: optimisticContent.content_json,
          status: optimisticContent.status,
          description: optimisticContent.description,
          is_preview: optimisticContent.is_preview,
          metadata: optimisticContent.metadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create content');
      }

      const newContent = await response.json();
      console.log('✅ [Store] Lesson created successfully:', newContent);

      // Validate the response
      if (!newContent.id) {
        throw new Error('Invalid response: Missing lesson ID');
      }
      
      // Update with real data
      set(state => {
        // Find the module again to ensure we have latest state
        const targetModule = state.modules.find(m => m.id === moduleId);
        if (!targetModule) {
          console.error('Module not found after lesson creation');
          return state;
        }

        const updatedModules = state.modules.map(m => 
          m.id === moduleId 
            ? {
                ...m,
                items: (m.items || []).map(item => 
                  item.id === tempId 
                    ? {
                        ...newContent,
                        content: newContent.content_json?.content || '',
                        content_json: newContent.content_json,
                        type: type as ModuleItem['type']
                      }
                    : item
                )
              }
            : m
        );

        return {
          ...state,
          modules: updatedModules,
          selectedLessonId: newContent.id,
          isLoading: false,
          error: null,
          savedState: 'saved',
          expandedModules: new Set([...state.expandedModules, moduleId])
        };
      });

      return newContent;
    } catch (error) {
      console.error('❌ [Store] Failed to create lesson:', error);
      
      // Rollback optimistic update
      set(state => ({
        modules: state.modules.map(m => 
          m.id === moduleId 
            ? { ...m, items: m.items?.filter(item => !item.id.startsWith('temp_')) || [] }
            : m
        ),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to add content',
        savedState: 'unsaved'
      }));

      throw error;
    }
  }
}); 