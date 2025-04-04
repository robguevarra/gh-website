import { toast } from 'sonner';
import type { ExtendedModule, ModuleItem, TransformedModule } from '../types';
import { validateModuleUpdate } from '../utils/validation';
import { cacheManager } from '../utils/cache';
import { transformModules } from '../utils/transform';
import type { CourseStore } from '../types/store';
import { StoreApi } from 'zustand';

type SetState = StoreApi<CourseStore>['setState'];

type LessonData = {
  id: string;
  title: string;
  content_json?: {
    content: string;
    type: string;
    version: number;
  };
  metadata?: {
    type?: ModuleItem['type'];
    [key: string]: unknown;
  };
};

export const createModuleActions = (set: SetState, get: () => CourseStore) => ({
  updateModule: async (moduleId: string, data: Partial<ExtendedModule>) => {
    console.log('🔄 [Store] Starting module update:');

    const course = get().course;
    if (!course) {
      console.error('❌ [Store] No course loaded, aborting module update');
      throw new Error('No course loaded');
    }

    set({ pendingSave: true, error: null });

    try {
      // Validate data before sending
      const validatedData = await validateModuleUpdate(data);
      console.log('✅ [Store] Module data validated:');

      const response = await fetch(`/api/admin/courses/${course.id}/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validatedData,
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update module');
      }

      const updatedModule = await response.json();

      // Update local state only - no need to refetch
      set((state: CourseStore) => ({
        course: state.course ? {
          ...state.course,
          modules: state.course.modules?.map(m =>
            m.id === moduleId ? { ...m, ...updatedModule } : m
          )
        } : null,
        pendingSave: false,
        lastSaveTime: new Date().toISOString(),
        error: null
      }));

      toast({
        title: 'Success',
        description: 'Module updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update module';
      console.error('❌ [Store] Module update failed:', {
        error,
        timestamp: new Date().toISOString()
      });
      set({ error: message, isLoading: false, pendingSave: false });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  },

  reorderModule: async (moduleId: string, newPosition: number) => {
    const course = get().course;
    if (!course?.modules) return;

    const modules = [...course.modules];
    const movedModule = modules.find(m => m.id === moduleId);
    if (!movedModule) return;

    const oldPosition = movedModule.position;

    // Update positions for all modules
    const updatedModules = [...modules];
    // Remove the module from its current position
    const moduleIndex = updatedModules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) return;

    const [removedModule] = updatedModules.splice(moduleIndex, 1);
    // Insert it at the new position
    updatedModules.splice(newPosition, 0, removedModule);

    // Update positions for all modules
    updatedModules.forEach((module, index) => {
      module.position = index;
    });

    try {
      set({ isLoading: true, error: null });

      // Make a single API call to reorder all modules
      const response = await fetch(`/api/courses/${course.id}/modules/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          moduleOrder: updatedModules.map(module => ({
            id: module.id,
            position: module.position
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder modules');
      }

      // Update the local state with the new module order
      set(state => ({
        ...state,
        modules: updatedModules,
        course: state.course ? {
          ...state.course,
          modules: updatedModules
        } : null,
        isLoading: false,
        error: null
      }));

      toast.success('Success', {
        description: `Module moved from position ${oldPosition} to ${newPosition}`
      });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, isLoading: false });
      toast.error('Error', {
        description: message
      });
    }
  },

  fetchModuleTree: async (courseId: string, moduleId: string) => {
    console.log('🔍 [Store] Fetching module tree:', { courseId, moduleId });

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch module data');
      }

      const module = await response.json();

      set((state: CourseStore) => ({
        course: state.course ? {
          ...state.course,
          modules: state.course.modules?.map(m => {
            if (m.id === moduleId) {
              const transformedModule: TransformedModule = {
                ...m,
                title: module.title,
                description: module.description || '',
                items: (module.lessons || []).map((lesson: LessonData) => ({
                  id: lesson.id,
                  title: lesson.title,
                  type: lesson.metadata?.type || 'lesson',
                  duration: 0,
                  content: lesson.content_json?.content || '',
                  content_json: lesson.content_json
                }))
              };
              return transformedModule;
            }
            return m;
          })
        } : null,
        isLoading: false,
        error: null
      }));

      // Expand the module
      set((state: CourseStore) => ({
        expandedModules: new Set([...state.expandedModules, moduleId])
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch module data';
      set({ error: message, isLoading: false });
      toast({
        title: 'Error updating module tree',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  },

  toggleExpandedModule: (moduleId: string) => {
    set((state: CourseStore) => {
      const newExpandedModules = new Set(state.expandedModules);
      if (newExpandedModules.has(moduleId)) {
        newExpandedModules.delete(moduleId);
      } else {
        newExpandedModules.add(moduleId);
      }
      return { expandedModules: newExpandedModules };
    });
  }
});