export interface Course {
  id: string
  title: string
  slug: string
  description?: string
  thumbnailUrl?: string
  trailerUrl?: string
  status: 'draft' | 'published' | 'archived'
  isFeatured?: boolean
  requiredTierId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  version: number
  publishedVersion?: number
  settings: {
    access: {
      dripContent: boolean
      prerequisiteCourses: string[]
    }
    display: {
      showProgress: boolean
      showCompletion: boolean
      showDiscussions: boolean
    }
    enrollment: {
      type: 'open'
      price?: number
      currency: string
      trialDays: number
    }
  }
}

export interface Module {
  id: string
  courseId: string
  title: string
  description?: string
  position: number
  createdAt: Date
  updatedAt: Date
  sectionId?: string
  isPublished: boolean
  metadata: Record<string, unknown>
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  description?: string
  videoUrl?: string
  duration?: number
  position: number
  isPreview?: boolean
  content?: string
  contentJson?: Record<string, unknown>
  attachments?: Array<{
    name: string
    url: string
    type: string
    size?: number
  }>
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  status: 'draft' | 'published' | 'archived'
  version: number
} 