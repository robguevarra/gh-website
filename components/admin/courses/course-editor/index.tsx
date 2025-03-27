'use client'

import { useState } from 'react'
import { Course } from '@/types/courses'
import { ModuleTree } from './module-tree'
import { ContentEditor } from './content-editor'
import { Preview } from './preview'
import { cn } from '@/lib/utils'

interface CourseEditorProps {
  course: Course
  className?: string
}

export function CourseEditor({ course, className }: CourseEditorProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)

  return (
    <div className={cn('grid grid-cols-12 gap-4 h-[calc(100vh-4rem)]', className)}>
      {/* Left Sidebar - Module Tree */}
      <div className="col-span-3 border-r p-4 overflow-y-auto">
        <ModuleTree
          courseId={course.id}
          onModuleSelect={setSelectedModuleId}
          onLessonSelect={setSelectedLessonId}
          selectedModuleId={selectedModuleId}
          selectedLessonId={selectedLessonId}
        />
      </div>

      {/* Main Content Area */}
      <div className="col-span-6 p-4 overflow-y-auto">
        <ContentEditor
          courseId={course.id}
          selectedModuleId={selectedModuleId}
          selectedLessonId={selectedLessonId}
        />
      </div>

      {/* Right Sidebar - Preview */}
      <div className="col-span-3 border-l p-4 overflow-y-auto">
        <Preview
          courseId={course.id}
          selectedModuleId={selectedModuleId}
          selectedLessonId={selectedLessonId}
        />
      </div>
    </div>
  )
} 