export type CourseStatus = 'draft' | 'published' | 'archived'
export type ModuleStatus = 'draft' | 'published' | 'archived'
export type LessonStatus = 'draft' | 'published' | 'archived'

export interface Course {
  id: string
  title: string
  description: string | null
  status: CourseStatus
  content_json?: Record<string, unknown>
  modules?: Module[]
  created_at?: string
  updated_at?: string
  version?: number
  published_version?: number
  metadata?: Record<string, unknown>
}

export interface Module {
  id: string
  title: string
  description?: string
  status: CourseStatus
  position: number
  course_id: string
  lessons?: Lesson[]
  created_at?: string
  updated_at?: string
}

export interface Lesson {
  id: string
  title: string
  description?: string
  status: CourseStatus
  position: number
  module_id: string
  content_json?: Record<string, unknown>
  version?: number
  created_at?: string
  updated_at?: string
} 