import { create } from 'zustand';
import { toast } from 'sonner';

export type Course = {
  id: string;
  title: string;
  description?: string;
  content_json?: Record<string, unknown>;
  modules?: Module[];
  created_at: string;
  updated_at: string;
  is_published: boolean;
  metadata?: Record<string, unknown>;
  version: number;
  published_version?: number;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  content_json?: Record<string, unknown>;
  position: number;
  status?: 'draft' | 'published' | 'archived';
  metadata?: Record<string, unknown>;
  lessons?: Lesson[];
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  content_json?: Record<string, unknown>;
  position: number;
  status?: 'draft' | 'published' | 'archived';
  version?: number;
  metadata?: Record<string, unknown>;
};

interface CourseStore {
  course: Course | null
  error: string | null
  isLoading: boolean
  selectedModuleId: string | null
  selectedLessonId: string | null
  fetchCourse: (courseId: string) => Promise<void>
  updateCourse: (courseId: string, data: Partial<Course>) => Promise<void>
  updateModule: (moduleId: string, data: Partial<Module>) => Promise<void>
  updateLesson: (lessonId: string, data: Partial<Lesson>) => Promise<void>
  reorderModule: (moduleId: string, newPosition: number) => Promise<void>
  reorderLesson: (lessonId: string, newPosition: number) => Promise<void>
  selectModule: (moduleId: string) => void
  selectLesson: (lessonId: string) => void
}

export const useCourseStore = create<CourseStore>((set, get) => ({
  course: null,
  error: null,
  isLoading: false,
  selectedModuleId: null,
  selectedLessonId: null,

  fetchCourse: async (courseId: string) => {
    console.log('🔄 Fetching course:', courseId);
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const course = await response.json();
      console.log('✅ Course fetched successfully:', course.id);
      set({ course, isLoading: false });
    } catch (error) {
      const message = (error as Error).message;
      console.error('❌ Error fetching course:', message);
      set({ error: message, isLoading: false });
      console.log('🔔 Showing error toast:', message);
      toast.error('Error', {
        description: message
      });
    }
  },

  updateCourse: async (courseId: string, data: Partial<Course>) => {
    console.log('🔄 Updating course:', courseId, data);
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update course');
      const updatedCourse = await response.json();
      console.log('✅ Course updated successfully:', updatedCourse.id);
      set({ course: updatedCourse, isLoading: false });
      console.log('🔔 Showing success toast: Course updated');
      toast.success('Success', {
        description: 'Course updated successfully'
      });
    } catch (error) {
      const message = (error as Error).message;
      console.error('❌ Error updating course:', message);
      set({ error: message, isLoading: false });
      console.log('🔔 Showing error toast:', message);
      toast.error('Error', {
        description: message
      });
    }
  },

  updateModule: async (moduleId: string, data: Partial<Module>) => {
    console.log('🔄 Updating module:', moduleId, data);
    set({ isLoading: true, error: null });
    try {
      const course = get().course;
      if (!course) throw new Error('No course loaded');

      const response = await fetch(`/api/courses/${course.id}/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update module');
      
      console.log('✅ Module updated successfully:', moduleId);
      // Refresh the course data to get the updated module
      await get().fetchCourse(course.id);
      set({ isLoading: false });
      console.log('🔔 Showing success toast: Module updated');
      toast.success('Success', {
        description: 'Module updated successfully'
      });
    } catch (error) {
      const message = (error as Error).message;
      console.error('❌ Error updating module:', message);
      set({ error: message, isLoading: false });
      console.log('🔔 Showing error toast:', message);
      toast.error('Error', {
        description: message
      });
    }
  },

  updateLesson: async (lessonId: string, data: Partial<Lesson>) => {
    console.log('🔄 Updating lesson:', lessonId, data);
    set({ isLoading: true, error: null });
    try {
      const course = get().course;
      if (!course) throw new Error('No course loaded');

      const module = course.modules?.find(m => m.lessons?.some(l => l.id === lessonId));
      if (!module) throw new Error('Module not found for lesson');

      const response = await fetch(`/api/courses/${course.id}/modules/${module.id}/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update lesson');
      
      console.log('✅ Lesson updated successfully:', lessonId);
      // Refresh the course data to get the updated lesson
      await get().fetchCourse(course.id);
      set({ isLoading: false });
      console.log('🔔 Showing success toast: Lesson updated');
      toast.success('Success', {
        description: 'Lesson updated successfully'
      });
    } catch (error) {
      const message = (error as Error).message;
      console.error('❌ Error updating lesson:', message);
      set({ error: message, isLoading: false });
      console.log('🔔 Showing error toast:', message);
      toast.error('Error', {
        description: message
      });
    }
  },

  reorderModule: async (moduleId: string, newPosition: number) => {
    console.log('🔄 Reordering module:', { moduleId, newPosition });
    const course = get().course;
    if (!course?.modules) return;

    const modules = [...course.modules];
    const movedModule = modules.find(m => m.id === moduleId);
    if (!movedModule) return;

    const oldPosition = movedModule.position;
    movedModule.position = newPosition;

    try {
      set({ isLoading: true, error: null });
      // Update all affected modules
      await Promise.all(
        modules.map((module) =>
          fetch(`/api/courses/${course.id}/modules/${module.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: module.position }),
          })
        )
      );

      console.log('✅ Module order updated successfully');
      // Refresh the course data
      await get().fetchCourse(course.id);
      console.log('🔔 Showing success toast: Module order updated');
      toast.success('Success', {
        description: `Module moved from position ${oldPosition} to ${newPosition}`
      });
    } catch (error) {
      const message = (error as Error).message;
      console.error('❌ Error reordering modules:', message);
      set({ error: message, isLoading: false });
      console.log('🔔 Showing error toast:', message);
      toast.error('Error', {
        description: message
      });
    }
  },

  reorderLesson: async (lessonId: string, newPosition: number) => {
    console.log('🔄 Reordering lesson:', { lessonId, newPosition });
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
      // Update all affected lessons
      await Promise.all(
        lessons.map((lesson) =>
          fetch(`/api/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: lesson.position }),
          })
        )
      );

      console.log('✅ Lesson order updated successfully');
      // Refresh the course data
      await get().fetchCourse(course.id);
      console.log('🔔 Showing success toast: Lesson order updated');
      toast.success('Success', {
        description: `Lesson moved from position ${oldPosition} to ${newPosition}`
      });
    } catch (error) {
      const message = (error as Error).message;
      console.error('❌ Error reordering lessons:', message);
      set({ error: message, isLoading: false });
      console.log('🔔 Showing error toast:', message);
      toast.error('Error', {
        description: message
      });
    }
  },

  selectModule: (moduleId: string) => {
    set({ selectedModuleId: moduleId, selectedLessonId: null })
  },

  selectLesson: (lessonId: string) => {
    // Find the module that contains this lesson
    const module = get().course?.modules?.find(m => 
      m.lessons?.some(l => l.id === lessonId)
    )
    set({ 
      selectedModuleId: module?.id || null,
      selectedLessonId: lessonId 
    })
  },
})); 