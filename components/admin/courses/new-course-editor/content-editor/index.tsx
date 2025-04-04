"use client"

import { useEffect, useMemo } from "react"
import { useCourseContext } from "../course-editor"
import { useCourseStore } from "@/lib/stores/course"
import { RichTextEditor } from "./rich-text-editor"

interface ContentEditorProps {
  onSave: () => void
}

export default function ContentEditor({ onSave }: ContentEditorProps) {
  const {
    currentContent: contextContent,
    setCurrentContent,
  } = useCourseContext()

  const {
    selectedModuleId,
    selectedLessonId,
    course,
  } = useCourseStore()

  // Memoize active module and lesson
  const { activeModule, activeLesson } = useMemo(() => {
    // Find the module directly from the course object
    const module = selectedModuleId && course?.modules
      ? course.modules.find(m => m.id === selectedModuleId)
      : null;

    // Find the lesson in the module
    const lesson = module && selectedLessonId
      ? module.lessons?.find(l => l.id === selectedLessonId) || null
      : null;

    return {
      activeModule: module,
      activeLesson: lesson
    }
  }, [selectedModuleId, selectedLessonId, course?.modules])

  // Update content in context when lesson changes
  useEffect(() => {
    if (!activeLesson) {
      // Don't clear content if there's no active lesson - this prevents flickering
      return
    }

    // Get content with fallbacks
    const content = activeLesson.content_json?.content || activeLesson.content || "<p>New lesson content goes here</p>"

    // Only update if content has changed
    if (content !== contextContent) {
      console.log('📝 [ContentEditor] Setting content from lesson:', {
        lessonId: selectedLessonId,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
      });
      setCurrentContent(content)
    }
  }, [activeLesson, contextContent, selectedLessonId, setCurrentContent])

  return (
    <div className="w-full">
      <RichTextEditor
        initialContent={contextContent || ""}
        onSave={onSave}
      />
    </div>
  )
}