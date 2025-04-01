"use client"

import { useCallback, useState } from "react"
import { useCourseContext } from "../../course-editor"
import { EditorToolbar } from "../toolbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface JsonEditorProps {
  onSave: () => void
}

export function JsonEditor({ onSave }: JsonEditorProps) {
  const { currentContent, setCurrentContent, setSavedState } = useCourseContext()
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    try {
      // Validate JSON
      if (value.trim()) {
        JSON.parse(value)
      }
      setError(null)
      setCurrentContent(value)
      setSavedState("unsaved")
    } catch (err) {
      setError("Invalid JSON format")
    }
  }, [setCurrentContent, setSavedState])

  return (
    <div className="relative min-h-[500px] rounded-md border">
      <EditorToolbar onSave={onSave} />
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <textarea
        value={currentContent || ""}
        onChange={handleChange}
        className="w-full h-[calc(100%-40px)] p-4 font-mono text-sm focus:outline-none resize-none"
        placeholder="Enter JSON content..."
      />
    </div>
  )
} 