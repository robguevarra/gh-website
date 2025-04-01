import { toast } from '@/components/ui/use-toast';
import type { Course, Module } from '../types';
import type { Lesson } from '../types/lesson';
import { validateCourseUpdate } from '../utils/validation';
import { cacheManager } from '../utils/cache';
import { transformCourse } from '../utils/transform';
import type { CourseStore } from '../types/store';
import { StoreApi } from 'zustand';

type SetState<T> = StoreApi<T>['setState'];
type GetState<T> = StoreApi<T>['getState'];

export const createCourseActions = (
  set: SetState<CourseStore>,
  get: GetState<CourseStore>
) => ({
  fetchCourse: async (courseId: string, signal?: AbortSignal) => {
    console.log('📥 [Course] Fetching course:', courseId);
    
    // Check if we're already loading this course
    if (get().isLoading) {
      console.log('⏳ [Course] Already loading course');
      return;
    }

    // Don't set loading state if we already have this course
    const currentCourse = get().course;
    if (currentCourse?.id === courseId) {
      console.log('✅ [Course] Course already loaded:', courseId);
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        credentials: 'include',
        signal
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course');
      }

      const courseData = await response.json();
      
      // Transform modules to include items from lessons
      const transformedModules = courseData.modules?.map((module: Module) => ({
        ...module,
        items: module.lessons?.map((lesson: Lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.metadata?.type || 'lesson',
          duration: lesson.metadata?.duration || 0,
          content: lesson.content_json?.content || '',
          content_json: lesson.content_json
        })) || []
      })) || [];

      // Check if the request was aborted before updating state
      if (signal?.aborted) {
        console.log('🚫 [Course] Fetch aborted - skipping state update');
        return;
      }

      // Set the transformed data
      set({
        course: courseData,
        modules: transformedModules,
        modulesCount: transformedModules.length,
        selectedModuleId: transformedModules[0]?.id || null,
        selectedLessonId: transformedModules[0]?.lessons?.[0]?.id || null,
        isLoading: false,
        error: null,
        savedState: 'saved'
      });

      console.log('✅ [Course] Successfully fetched course:', {
        id: courseData.id,
        modulesCount: transformedModules.length,
        selectedModule: transformedModules[0]?.id || null,
      });
    } catch (error) {
      // Don't update error state for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 [Course] Fetch aborted');
        return;
      }
      
      console.error('❌ [Course] Failed to fetch course:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch course',
        isLoading: false 
      });
      throw error;
    } finally {
      // Only reset loading state if the request wasn't aborted
      if (!signal?.aborted) {
        set(state => ({
          ...state,
          isLoading: false
        }));
      }
    }
  },

  updateCourse: async (courseId: string, data: Partial<Course>) => {
    console.log('🔄 [Store] Starting course update:');

    set({ pendingSave: true, error: null });
    
    try {
      // Validate data before sending
      const validatedData = await validateCourseUpdate(data);
      console.log('✅ [Store] Course data validated:');

      const requestBody = {
        ...validatedData,
        updated_at: new Date().toISOString()
      };

      console.log('📤 [Store] Sending request:');

      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update course');
      }
      
      const updatedCourse = await response.json();
      
      // Update local state only - no need to refetch
      set((state: CourseStore) => ({
        course: state.course ? { ...state.course, ...updatedCourse } : null,
        pendingSave: false,
        lastSaveTime: new Date().toISOString(),
        error: null
      }));
      
      toast({
        title: 'Success',
        description: 'Course updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update course';
      set({ error: message, isLoading: false, pendingSave: false });
      toast({
        title: 'Error saving changes',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }
}); 