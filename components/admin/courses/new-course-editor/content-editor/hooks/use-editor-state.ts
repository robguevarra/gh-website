"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { useCourseContext } from "../../course-editor"
import { useCourseStore } from "@/lib/stores/course"
import { debounce } from "lodash"

export interface EditorState {
  content: string
  title: string
  isEditorInitialized: boolean
  isContentLoading: boolean
  isSaving: boolean
}

export function useEditorState() {
  const { toast } = useToast()
  const { 
    modules,
    setSavedState, 
    setCurrentContent,
  } = useCourseContext()
  
  const { 
    selectedModuleId, 
    selectedLessonId, 
    updateLesson 
  } = useCourseStore()

  // State
  const [state, setState] = useState<EditorState>({
    content: "",
    title: "",
    isEditorInitialized: false,
    isContentLoading: false,
    isSaving: false
  })

  // Refs
  const contentRef = useRef("")
  const editorRef = useRef<HTMLDivElement | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialMount = useRef(true)

  // Memoize active module and item
  const activeItem = useCallback(() => {
    if (!selectedModuleId || !selectedLessonId) return null
    const module = modules?.find((m) => m.id === selectedModuleId)
    return module?.items?.find((i) => i.id === selectedLessonId)
  }, [modules, selectedModuleId, selectedLessonId])

  // Initialize debounced save function
  const debouncedSave = useRef(
    debounce(async (content: string) => {
      if (!selectedLessonId) return
      try {
        await saveContent(content)
      } catch (error) {
        console.error("Failed to save content:", error)
        setSavedState("unsaved")
        toast({
          title: "Error saving content",
          description: error instanceof Error ? error.message : "Your changes could not be saved. Please try again.",
          variant: "destructive",
        })
      }
    }, 1000)
  ).current

  // Save content
  const saveContent = async (newContent: string) => {
    const item = activeItem()
    if (!item?.id) return

    try {
      setState(prev => ({ ...prev, isSaving: true }))
      setSavedState("saving")
      
      debouncedSave.cancel()

      await updateLesson(item.id, {
        content_json: {
          content: newContent,
          type: "html",
          version: 1
        },
        title: state.title
      })

      contentRef.current = newContent
      setSavedState("saved")
      
      toast({
        title: "Changes saved",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to save changes:", error)
      setSavedState("unsaved")
      toast({
        title: "Error saving changes",
        description: error instanceof Error ? error.message : "Your changes could not be saved. Please try again.",
        variant: "destructive",
      })
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }

  // Load content when active item changes
  useEffect(() => {
    const item = activeItem()
    
    // Skip initial mount to prevent double loading
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Reset state if no item selected
    if (!item) {
      setState(prev => ({
        ...prev,
        content: "",
        title: "",
        isEditorInitialized: false
      }))
      contentRef.current = ""
      if (editorRef.current) {
        editorRef.current.innerHTML = ""
      }
      return
    }

    // Load content
    const lessonContent = item.content_json?.content || item.content || ""
    
    setState(prev => ({
      ...prev,
      isContentLoading: true,
      title: item.title,
      content: lessonContent,
      isEditorInitialized: true
    }))
    
    contentRef.current = lessonContent
    if (editorRef.current) {
      editorRef.current.innerHTML = lessonContent
    }

    setCurrentContent(lessonContent)
    setState(prev => ({ ...prev, isContentLoading: false }))

  }, [activeItem, setCurrentContent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [debouncedSave])

  return {
    state,
    setState,
    contentRef,
    editorRef,
    saveContent,
    debouncedSave
  }
} 