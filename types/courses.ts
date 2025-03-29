export interface Course {
  id: string
  title: string
  description: string
  content_json?: Record<string, unknown>
  modules: Module[]
  created_at: string
  updated_at: string
  is_published: boolean
  metadata: Record<string, unknown>
  version: number
  published_version?: number
}

export interface Module {
  id: string
  title: string
  description?: string
  content_json?: Record<string, unknown>
  position: number
  course_id: string
  lessons: Lesson[]
  created_at: string
  updated_at: string
  is_published: boolean
  metadata: Record<string, unknown>
  version: number
}

export interface Lesson {
  id: string
  title: string
  description?: string
  content_json?: Record<string, unknown>
  position: number
  module_id: string
  created_at: string
  updated_at: string
  is_published: boolean
  metadata: Record<string, unknown>
  version: number
  status: 'draft' | 'published' | 'archived'
} 