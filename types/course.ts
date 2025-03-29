export type CourseStatus = 'draft' | 'published' | 'archived'
export type ModuleStatus = 'draft' | 'published' | 'archived'
export type LessonStatus = 'draft' | 'published' | 'archived'

export interface Course {
  id: string
  title: string
  description: string
  status: CourseStatus
  is_published: boolean
  modules?: Module[]
  created_at?: string
  updated_at?: string
}

export interface Module {
  id: string
  title: string
  description: string
  position: number
  status: ModuleStatus
  lessons?: Lesson[]
  created_at?: string
  updated_at?: string
}

export interface Lesson {
  id: string
  title: string
  description: string
  content_json: string | Record<string, unknown>
  position: number
  status: LessonStatus
  created_at?: string
  updated_at?: string
} 