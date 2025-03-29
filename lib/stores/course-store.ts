import { create } from 'zustand';
import { toast } from '@/components/ui/use-toast';
import type { Course, Module, Lesson } from '@/types/course';
import { debounce } from 'lodash';
import { z } from 'zod';

// Add schema validation
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
  selectedModuleId: string | null;
  selectedLessonId: string | null;
  isLoading: boolean;
  error: string | null;
  pendingSave: boolean;
  lastSaveTime: string | null;
  fetchCourse: (courseId: string) => Promise<void>;
  updateCourse: (courseId: string, data: Partial<Course>) => Promise<void>;
  updateModule: (moduleId: string, data: Partial<Module>) => Promise<void>;
  updateLesson: (lessonId: string, data: Partial<Lesson>) => Promise<void>;
  reorderModule: (moduleId: string, newPosition: number) => Promise<void>;
  reorderLesson: (lessonId: string, newPosition: number) => Promise<void>;
  selectModule: (moduleId: string | null) => void;
  selectLesson: (lessonId: string | null) => void;
}

export const useCourseStore = create<CourseStore>((set, get) => {
  // Create debounced save functions
  const debouncedUpdateCourse = debounce(async (courseId: string, data: Partial<Course>) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          updated_at: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update course');
      }
      
      const updatedCourse = await response.json();
      
      // Fetch fresh data to ensure we have the latest state
      await get().fetchCourse(courseId);
      
      set({ 
        isLoading: false,
        pendingSave: false,
        lastSaveTime: new Date().toISOString(),
        error: null
      });
      
      toast({
        title: 'Success',
        description: 'Course updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update course';
      console.error('❌ Error updating course:', message);
      set({ error: message, isLoading: false, pendingSave: false });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, 1000);

  const debouncedUpdateModule = debounce(async (moduleId: string, data: Partial<Module>) => {
    const course = get().course;
    if (!course) throw new Error('No course loaded');

    const module = course.modules?.find(m => m.id === moduleId);
    if (!module) throw new Error('Module not found');

    try {
      // Validate data before sending
      const validatedData = moduleUpdateSchema.parse(data);
      
      set({ pendingSave: true, error: null });

      const response = await fetch(`/api/courses/${course.id}/modules/${moduleId}`, {
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

      // Update local state first
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

      // Then fetch fresh data to ensure consistency
      await get().fetchCourse(course.id);
      
      toast({
        title: 'Success',
        description: 'Module updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update module';
      console.error('❌ Error updating module:', message);
      set({ error: message, isLoading: false, pendingSave: false });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, 1000);

  const debouncedUpdateLesson = debounce(async (lessonId: string, data: Partial<Lesson>) => {
    const course = get().course;
    if (!course) throw new Error('No course loaded');

    const module = course.modules?.find(m => 
      m.lessons?.some(l => l.id === lessonId)
    );
    
    if (!module) throw new Error('Module not found for lesson');

    try {
      // Validate data before sending
      const validatedData = lessonUpdateSchema.parse(data);
      
      set({ pendingSave: true, error: null });

      const response = await fetch(`/api/courses/${course.id}/modules/${module.id}/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for sending cookies
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

      // Update local state first
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

      // Then fetch fresh data to ensure consistency
      await get().fetchCourse(course.id);
      
      toast({
        title: 'Success',
        description: 'Lesson updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update lesson';
      console.error('❌ Error updating lesson:', message);
      set({ error: message, isLoading: false, pendingSave: false });
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, 1000);

  return {
    course: null,
    selectedModuleId: null,
    selectedLessonId: null,
    isLoading: false,
    error: null,
    pendingSave: false,
    lastSaveTime: null,

    fetchCourse: async (courseId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/courses/${courseId}`, {
          credentials: 'include', // Important for sending cookies
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch course');
        }
        const course = await response.json();
        set({ course, isLoading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch course';
        set({ error: message, isLoading: false });
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
    },

    updateCourse: async (courseId: string, data: Partial<Course>) => {
      set({ pendingSave: true });
      // Cancel any pending debounced saves
      debouncedUpdateCourse.cancel();
      // Start a new debounced save
      debouncedUpdateCourse(courseId, data);
    },

    updateModule: async (moduleId: string, data: Partial<Module>) => {
      set({ pendingSave: true });
      // Cancel any pending debounced saves
      debouncedUpdateModule.cancel();
      // Start a new debounced save
      debouncedUpdateModule(moduleId, data);
    },

    updateLesson: async (lessonId: string, data: Partial<Lesson>) => {
      set({ pendingSave: true });
      // Cancel any pending debounced saves
      debouncedUpdateLesson.cancel();
      // Start a new debounced save
      debouncedUpdateLesson(lessonId, data);
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
            fetch(`/api/courses/${course.id}/modules/${module.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include', // Important for sending cookies
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
    }
  };
}); 