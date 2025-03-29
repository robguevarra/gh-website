import { create } from 'zustand'
import { Course, Module, Lesson } from '@/types/course'

interface CourseState {
  course: Course | null
  selectedModuleId: string | null
  selectedLessonId: string | null
  isLoading: boolean
  error: Error | null
  fetchCourse: (courseId: string) => Promise<void>
  updateCourse: (courseId: string, data: Partial<Course>) => Promise<void>
  updateModule: (moduleId: string, data: Partial<Module>) => Promise<void>
  updateLesson: (lessonId: string, data: Partial<Lesson>) => Promise<void>
  selectModule: (moduleId: string | null) => void
  selectLesson: (lessonId: string | null) => void
}

export const useCourseStore = create<CourseState>((set) => ({
  course: null,
  selectedModuleId: null,
  selectedLessonId: null,
  isLoading: false,
  error: null,

  fetchCourse: async (courseId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`/api/courses/${courseId}`)
      if (!response.ok) throw new Error('Failed to fetch course')
      const course = await response.json()
      set({ course, isLoading: false })
    } catch (error) {
      set({ error: error as Error, isLoading: false })
    }
  },

  updateCourse: async (courseId: string, data: Partial<Course>) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update course')
      const updatedCourse = await response.json()
      set({ course: updatedCourse })
    } catch (error) {
      throw error
    }
  },

  updateModule: async (moduleId: string, data: Partial<Module>) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update module')
      const updatedModule = await response.json()
      set((state) => ({
        course: state.course ? {
          ...state.course,
          modules: state.course.modules?.map(m => 
            m.id === moduleId ? { ...m, ...updatedModule } : m
          )
        } : null
      }))
    } catch (error) {
      throw error
    }
  },

  updateLesson: async (lessonId: string, data: Partial<Lesson>) => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update lesson')
      const updatedLesson = await response.json()
      set((state) => ({
        course: state.course ? {
          ...state.course,
          modules: state.course.modules?.map(m => ({
            ...m,
            lessons: m.lessons?.map(l => 
              l.id === lessonId ? { ...l, ...updatedLesson } : l
            )
          }))
        } : null
      }))
    } catch (error) {
      throw error
    }
  },

  selectModule: (moduleId: string | null) => set({ selectedModuleId: moduleId }),
  selectLesson: (lessonId: string | null) => set({ selectedLessonId: lessonId }),
})) 