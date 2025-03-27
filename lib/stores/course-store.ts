import { create } from 'zustand';

export type Course = {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  settings?: {
    access: {
      drip_content: boolean;
      prerequisite_courses: string[];
    };
    display: {
      show_progress: boolean;
      show_completion: boolean;
      show_discussions: boolean;
    };
    enrollment: {
      type: 'open' | 'invite' | 'paid';
      price: number | null;
      currency: string;
      trial_days: number;
    };
  };
  modules?: Module[];
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  description?: string;
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

type CourseStore = {
  course: Course | null;
  isLoading: boolean;
  error: string | null;
  fetchCourse: (courseId: string) => Promise<void>;
  updateCourse: (courseId: string, data: Partial<Course>) => Promise<void>;
  updateModule: (moduleId: string, data: Partial<Module>) => Promise<void>;
  updateLesson: (lessonId: string, data: Partial<Lesson>) => Promise<void>;
  reorderModule: (oldIndex: number, newIndex: number) => Promise<void>;
  reorderLesson: (moduleId: string, oldIndex: number, newIndex: number) => Promise<void>;
};

export const useCourseStore = create<CourseStore>((set, get) => ({
  course: null,
  isLoading: false,
  error: null,

  fetchCourse: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const course = await response.json();
      set({ course, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateCourse: async (courseId: string, data: Partial<Course>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update course');
      const updatedCourse = await response.json();
      set({ course: updatedCourse, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateModule: async (moduleId: string, data: Partial<Module>) => {
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
      
      // Refresh the course data to get the updated module
      await get().fetchCourse(course.id);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateLesson: async (lessonId: string, data: Partial<Lesson>) => {
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
      
      // Refresh the course data to get the updated lesson
      await get().fetchCourse(course.id);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  reorderModule: async (oldIndex: number, newIndex: number) => {
    const course = get().course;
    if (!course?.modules) return;

    const modules = [...course.modules];
    const [movedModule] = modules.splice(oldIndex, 1);
    modules.splice(newIndex, 0, movedModule);

    // Update positions
    const updatedModules = modules.map((module, index) => ({
      ...module,
      position: index,
    }));

    try {
      set({ isLoading: true, error: null });
      // Update all affected modules
      await Promise.all(
        updatedModules.map((module) =>
          fetch(`/api/courses/${course.id}/modules/${module.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: module.position }),
          })
        )
      );

      // Refresh the course data
      await get().fetchCourse(course.id);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  reorderLesson: async (moduleId: string, oldIndex: number, newIndex: number) => {
    const course = get().course;
    if (!course) return;

    const module = course.modules?.find(m => m.id === moduleId);
    if (!module?.lessons) return;

    const lessons = [...module.lessons];
    const [movedLesson] = lessons.splice(oldIndex, 1);
    lessons.splice(newIndex, 0, movedLesson);

    // Update positions
    const updatedLessons = lessons.map((lesson, index) => ({
      ...lesson,
      position: index,
    }));

    try {
      set({ isLoading: true, error: null });
      // Update all affected lessons
      await Promise.all(
        updatedLessons.map((lesson) =>
          fetch(`/api/courses/${course.id}/modules/${moduleId}/lessons/${lesson.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: lesson.position }),
          })
        )
      );

      // Refresh the course data
      await get().fetchCourse(course.id);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
})); 