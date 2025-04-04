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

  // Memoize active module and lesson - don't depend on the entire modules array
  const { activeModule, activeLesson } = useMemo(() => {
    // Find the module directly from the course object to avoid depending on the modules array
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
  }, [selectedModuleId, selectedLessonId, course?.modules]) // Only depend on course.modules, not course.id or entire object

  // Update content in context when lesson changes - optimized to reduce re-renders
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

  // Use memo to prevent re-renders of the tabs component
  const editorTabs = useMemo(() => (
    <TabsList>
      <TabsTrigger value="editor">Visual Editor</TabsTrigger>
      <TabsTrigger value="html">HTML</TabsTrigger>
      <TabsTrigger value="json">JSON</TabsTrigger>
    </TabsList>
  ), []);

  // Use memo for each tab content to prevent unnecessary re-renders
  const visualEditorContent = useMemo(() => (
    <TabsContent value="editor" className="mt-0">
      <VisualEditor onSave={onSave} />
    </TabsContent>
  ), [onSave]);

  const htmlEditorContent = useMemo(() => (
    <TabsContent value="html" className="mt-0">
      <HtmlEditor onSave={onSave} />
    </TabsContent>
  ), [onSave]);

  const jsonEditorContent = useMemo(() => (
    <TabsContent value="json" className="mt-0">
      <JsonEditor onSave={onSave} />
    </TabsContent>
  ), [onSave]);

  return (
    <Tabs
      defaultValue="editor"
      className="w-full"
      value={editorMode}
      onValueChange={setEditorMode}
    >
      {editorTabs}
      {visualEditorContent}
      {htmlEditorContent}
      {jsonEditorContent}
    </Tabs>
  )
}