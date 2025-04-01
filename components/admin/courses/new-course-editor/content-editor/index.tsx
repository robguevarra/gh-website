"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCourseContext } from "../course-editor"
import { useCourseStore } from "@/lib/stores/course"
import { VisualEditor } from "./tabs/visual-editor"
import { HtmlEditor } from "./tabs/html-editor"
import { JsonEditor } from "./tabs/json-editor"

interface ContentEditorProps {
  onSave: () => void
}

export default function ContentEditor({ onSave }: ContentEditorProps) {
  const [editorMode, setEditorMode] = useState("editor")
  
  const { 
    setSavedState,
    currentContent: contextContent,
    setCurrentContent,
  } = useCourseContext()
  
  const { 
    selectedModuleId, 
    selectedLessonId,
    course,
    modules
  } = useCourseStore()

  // Memoize active module and lesson
  const { activeModule, activeLesson } = useMemo(() => {
    const module = modules?.find(m => m.id === selectedModuleId)
    return {
      activeModule: module,
      activeLesson: module?.items?.find(l => l.id === selectedLessonId)
    }
  }, [modules, selectedModuleId, selectedLessonId])

  // Update content in context when lesson changes
  useEffect(() => {
    if (!activeLesson) {
      setCurrentContent("")
      return
    }

    const content = activeLesson.content_json?.content || activeLesson.content || ""
    setCurrentContent(content)
  }, [activeLesson, setCurrentContent])

  return (
    <Tabs
      defaultValue="editor"
      className="w-full"
      value={editorMode}
      onValueChange={setEditorMode}
    >
      <TabsList>
        <TabsTrigger value="editor">Visual Editor</TabsTrigger>
        <TabsTrigger value="html">HTML</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
      </TabsList>

      <TabsContent value="editor" className="mt-0">
        <VisualEditor onSave={onSave} />
      </TabsContent>

      <TabsContent value="html" className="mt-0">
        <HtmlEditor onSave={onSave} />
      </TabsContent>

      <TabsContent value="json" className="mt-0">
        <JsonEditor onSave={onSave} />
      </TabsContent>
    </Tabs>
  )
} 