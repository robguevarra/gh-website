import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from '@/components/ui/use-toast';
import type { Course, Module, Lesson } from '@/types/course';
import { debounce } from 'lodash';
import { z } from 'zod';

// Import ModuleItem type from course-editor
import type { ModuleItem } from '@/components/admin/courses/new-course-editor/course-editor';

// Export types for external use
export type { Course, Module, Lesson };

// Update Module type to include items
export interface ExtendedModule extends Module {
  items?: ModuleItem[];
}

// Add schema validation
const courseUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  is_published: z.boolean().optional(),
  content_json: z.record(z.unknown()).optional(),
  version: z.number().optional(),
  published_version: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  updated_at: z.string().datetime().optional()
});

const lessonUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content_json: z.record(z.unknown()).optional(),
  position: z.number().int().min(0).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  version: z.number().int().min(1).optional(),
  metadata: z.record(z.unknown()).optional()
});

const moduleUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  position: z.number().int().min(0).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  metadata: z.record(z.unknown()).optional()
});

interface CourseStore {
  course: Course | null;
  modules: ExtendedModule[];
  selectedModuleId: string | null;
  selectedLessonId: string | null;
  isLoading: boolean;
  error: string | null;
  pendingSave: boolean;
  lastSaveTime: string | null;
  expandedModules: Set<string>;
  savedState: 'saved' | 'unsaved' | 'saving';
  requestCache: Map<string, { data: any; timestamp: number }>;
  
  // Actions
  fetchCourse: (courseId: string) => Promise<void>;
  updateCourse: (courseId: string, data: Partial<Course>) => Promise<void>;
  updateModule: (moduleId: string, data: Partial<ExtendedModule>) => Promise<void>;
  updateLesson: (lessonId: string, data: Partial<Lesson>) => Promise<void>;
  reorderModule: (moduleId: string, newPosition: number) => Promise<void>;
  reorderLesson: (lessonId: string, newPosition: number) => Promise<void>;
  selectModule: (moduleId: string | null) => void;
  selectLesson: (lessonId: string | null) => void;
  fetchModuleTree: (courseId: string, moduleId: string) => Promise<void>;
  addContent: (courseId: string, moduleId: string, type: string) => Promise<void>;
  toggleExpandedModule: (moduleId: string) => void;
  setModules: (modules: ExtendedModule[]) => void;
  setSavedState: (state: 'saved' | 'unsaved' | 'saving') => void;
  clearCache: () => void;
}

// Add request cache interface and configuration
interface RequestCache {
  data: any;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const requestCache = new Map<string, RequestCache>();

// Add request deduplication
const pendingRequests = new Map<string, Promise<any>>();

export const useCourseStore = create<CourseStore>()(
  persist(
    (set, get) => ({
      course: null,
      modules: [],
      selectedModuleId: null,
      selectedLessonId: null,
      isLoading: false,
      error: null,
      pendingSave: false,
      lastSaveTime: null,
      expandedModules: new Set<string>(),
      savedState: 'saved',
      requestCache: new Map(),

      clearCache: () => {
        requestCache.clear();
        pendingRequests.clear();
      },

      fetchCourse: async (courseId: string) => {
        console.log('🔄 [Store] Starting course fetch');
        const cacheKey = `course-${courseId}`;
        
        // Check cache first
        const cached = requestCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
          console.log('✅ [Store] Using cached course data');
          set({ course: cached.data, isLoading: false, error: null });
          return;
        }

        // Check for pending request
        if (pendingRequests.has(cacheKey)) {
          console.log('⏳ [Store] Using pending request');
          await pendingRequests.get(cacheKey);
          return;
        }

        set({ isLoading: true, error: null });
        
        // Create the request promise
        const requestPromise = (async () => {
          try {
            const response = await fetch(`/api/courses/${courseId}`);
            if (!response.ok) throw new Error('Failed to fetch course');
            
            const course = await response.json();
            
            // Transform course data in the store
            const transformedCourse = {
              ...course,
              modules: course.modules?.map(module => ({
                ...module,
                items: module.lessons?.map(lesson => ({
                  id: lesson.id,
                  title: lesson.title,
                  type: lesson.metadata?.type || 'lesson',
                  content: lesson.content_json?.content || '',
                  content_json: lesson.content_json,
                  duration: 0
                }))
              }))
            };

            // Update cache
            requestCache.set(cacheKey, {
              data: transformedCourse,
              timestamp: Date.now(),
              expiresAt: Date.now() + CACHE_DURATION
            });

            set({ course: transformedCourse, isLoading: false, error: null });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch course';
            set({ error: message, isLoading: false });
            throw error;
          } finally {
            pendingRequests.delete(cacheKey);
          }
        })();

        // Store the pending request
        pendingRequests.set(cacheKey, requestPromise);
        await requestPromise;
      },

      // New actions
      setModules: (modules: ExtendedModule[]) => {
        set({ modules });
      },

      setSavedState: (savedState: 'saved' | 'unsaved' | 'saving') => {
        set({ savedState });
      },

      // Update addContent to handle optimistic updates
      addContent: async (courseId: string, moduleId: string, type: string) => {
        const { modules } = get();
        console.log('➕ [Store] Adding new content:', { courseId, moduleId, type });
        
        set({ isLoading: true, error: null, savedState: 'saving' });
        
        try {
          // Create optimistic update
          const tempId = `temp-${Date.now()}`;
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
            }
          };

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

          // Ensure module is expanded
          set(state => ({
            expandedModules: new Set([...state.expandedModules, moduleId])
          }));
          
          toast({
            title: 'Success',
            description: `New ${type} added successfully`,
          });

        } catch (error) {
          // Rollback optimistic update
          set(state => ({
            modules: state.modules.map(m => 
              m.id === moduleId 
                ? { ...m, items: m.items?.filter(item => !item.id.startsWith('temp-')) }
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
        }
      },

      updateCourse: async (courseId: string, data: Partial<Course>) => {
        console.log('🔄 [Store] Starting course update:');

        set({ pendingSave: true, error: null });
        
        try {
          // Validate data before sending
          const validatedData = courseUpdateSchema.parse(data);
          console.log('✅ [Store] Course data validated:');

          const requestBody = {
            ...validatedData,
            updated_at: new Date().toISOString()
          };

          console.log('📤 [Store] Sending request:');

          const response = await fetch(`/api/courses/${courseId}`, {
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
          set(state => ({
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
          let message = 'Failed to update course';
          
          if (error instanceof z.ZodError) {
            message = 'Invalid course data: ' + error.errors.map(e => e.message).join(', ');
          } else if (error instanceof Error) {
            message = error.message;
          }
          
          set({ error: message, isLoading: false, pendingSave: false });
          toast({
            title: 'Error saving changes',
            description: message,
            variant: 'destructive',
          });
          throw error;
        }
      },

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
          const validatedData = moduleUpdateSchema.parse(data);
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
          set(state => ({
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

      updateLesson: async (lessonId: string, data: Partial<Lesson>) => {
        console.log('🔄 [Store] Starting lesson update:');
        const course = get().course;
        if (!course) {
          console.error('❌ [Store] No course loaded, aborting lesson update');
          throw new Error('No course loaded');
        }

        const module = course.modules?.find(m => 
          m.lessons?.some(l => l.id === lessonId)
        );
        
        if (!module) {
          console.error('❌ [Store] Module not found for lesson:', lessonId);
          throw new Error('Module not found for lesson');
        }

        set({ pendingSave: true, error: null });
        
        try {
          // Validate data before sending
          const validatedData = lessonUpdateSchema.parse(data);
          console.log('✅ [Store] Lesson data validated:');

          const response = await fetch(`/api/courses/${course.id}/modules/${module.id}/lessons/${lessonId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              ...validatedData,
              updated_at: new Date().toISOString()
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update lesson');
          }

          const updatedLesson = await response.json();
          
          // Update local state only - no need to refetch
          set(state => ({
            course: state.course ? {
              ...state.course,
              modules: state.course.modules?.map(m =>
                m.id === module.id ? {
                  ...m,
                  lessons: m.lessons?.map(l =>
                    l.id === lessonId ? { ...l, ...updatedLesson } : l
                  )
                } : m
              )
            } : null,
            pendingSave: false,
            lastSaveTime: new Date().toISOString(),
            error: null
          }));
          
          toast({
            title: 'Success',
            description: 'Lesson updated successfully',
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update lesson';
          console.error('❌ [Store] Lesson update failed:', {
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
        movedModule.position = newPosition;

        try {
          set({ isLoading: true, error: null });
          await Promise.all(
            modules.map((module) =>
              fetch(`/api/admin/courses/${course.id}/modules/${module.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                  position: module.position,
                  updated_at: new Date().toISOString()
                }),
              })
            )
          );

          await get().fetchCourse(course.id);
          toast({
            title: 'Success',
            description: `Module moved from position ${oldPosition} to ${newPosition}`,
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
                credentials: 'include', // Important for sending cookies
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

      selectModule: (moduleId: string | null) => {
        set({ selectedModuleId: moduleId });
      },

      selectLesson: (lessonId: string | null) => {
        set({ selectedLessonId: lessonId });
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
          
          set(state => ({
            course: state.course ? {
              ...state.course,
              modules: state.course.modules?.map(m => {
                if (m.id === moduleId) {
                  return {
                    ...m,
                    title: module.title,
                    description: module.description || '',
                    items: (module.lessons || []).map((lesson: {
                      id: string;
                      title: string;
                      content_json?: {
                        content: string;
                        type: string;
                        version: number;
                      };
                      metadata?: Record<string, any>;
                    }) => ({
                      id: lesson.id,
                      title: lesson.title,
                      type: (lesson.metadata?.type as ModuleItem['type']) || 'lesson',
                      duration: 0,
                      content: lesson.content_json?.content || '',
                      content_json: lesson.content_json
                    }))
                  } as ExtendedModule;
                }
                return m as ExtendedModule;
              })
            } : null,
            isLoading: false,
            error: null
          }));

          // Expand the module
          set(state => ({
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
        set(state => {
          const newExpandedModules = new Set(state.expandedModules);
          if (newExpandedModules.has(moduleId)) {
            newExpandedModules.delete(moduleId);
          } else {
            newExpandedModules.add(moduleId);
          }
          return { expandedModules: newExpandedModules };
        });
      }
    }),
    {
      name: 'course-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        course: state.course,
        modules: state.modules,
        expandedModules: Array.from(state.expandedModules),
        selectedModuleId: state.selectedModuleId,
        selectedLessonId: state.selectedLessonId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert expandedModules back to Set
          state.expandedModules = new Set(state.expandedModules);
          
          // Initialize cache
          state.requestCache = new Map();
          
          console.log('🔄 [Store] Rehydrated state:', {
            courseId: state.course?.id,
            modulesCount: state.modules.length,
            selectedModule: state.selectedModuleId,
            selectedLesson: state.selectedLessonId,
            expandedModules: state.expandedModules.size
          });
        }
      },
    }
  )
);

// Helper function to transform modules
function transformModules(modules: any[]): ExtendedModule[] {
  return (modules || []).map(module => ({
    ...module,
    items: (module.lessons || []).map((lesson: any) => ({
      id: lesson.id,
      title: lesson.title,
      type: (lesson.metadata?.type as ModuleItem['type']) || 'lesson',
      duration: 0,
      content: lesson.content_json?.content || '',
      content_json: lesson.content_json
    }))
  }));
} 