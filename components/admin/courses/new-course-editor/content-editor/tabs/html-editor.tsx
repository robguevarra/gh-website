"use client"

import { useCallback } from "react"
import { useCourseContext } from "../../course-editor"
import { EditorToolbar } from "../toolbar"

interface HtmlEditorProps {
  onSave: () => void
}

export function HtmlEditor({ onSave }: HtmlEditorProps) {
  const { currentContent, setCurrentContent, setSavedState } = useCourseContext()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentContent(e.target.value)
    setSavedState("unsaved")
  }, [setCurrentContent, setSavedState])

  return (
    <div className="relative min-h-[500px] rounded-md border">
      <EditorToolbar onSave={onSave} />
      <textarea
        value={currentContent || ""}
        onChange={handleChange}
        className="w-full h-[calc(100%-40px)] p-4 font-mono text-sm focus:outline-none resize-none"
        placeholder="Enter HTML content..."
      />
    </div>
  )
} 