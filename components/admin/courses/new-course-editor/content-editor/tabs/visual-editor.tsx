"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { useCourseContext } from "../../course-editor"
import { useCourseStore } from "@/lib/stores/course"
import { EditorToolbar } from "../toolbar"
import debounce from "lodash/debounce"
import { useToast } from "@/components/ui/use-toast"

interface VisualEditorProps {
  onSave: () => void
}

export function VisualEditor({ onSave }: VisualEditorProps) {
  const { currentContent, setCurrentContent, setSavedState } = useCourseContext()
  const { toast } = useToast()
  const { 
    selectedModuleId, 
    selectedLessonId, 
    updateLesson,
    course
  } = useCourseStore()

  // Debounce content updates
  const debouncedContentUpdate = useMemo(
    () =>
      debounce(async (html: string) => {
        if (!selectedLessonId || !course) return;
        
        setCurrentContent(html)
        setSavedState("saving")
        
        try {
          await updateLesson(selectedLessonId, {
            content_json: {
              content: html,
              type: 'html',
              version: 1
            }
          })
          setSavedState("saved")
          toast({
            description: "Changes saved automatically"
          })
        } catch (error) {
          console.error('Failed to save content:', error)
          setSavedState("unsaved")
          toast({
            title: "Error",
            description: "Failed to save changes. Please try again.",
            variant: "destructive"
          })
        }
      }, 1000),
    [setCurrentContent, setSavedState, selectedLessonId, course?.id, updateLesson, toast]
  )

  // Memoize editor configuration
  const editorConfig = useMemo(
    () => ({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3]
          },
          history: {
            depth: 10,
            newGroupDelay: 500
          }
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline"
          }
        }),
        Image.configure({
          HTMLAttributes: {
            class: "rounded-lg max-w-full"
          }
        }),
        Placeholder.configure({
          placeholder: "Start writing your content..."
        })
      ],
      content: currentContent || "",
      onUpdate: ({ editor }: { editor: Editor }) => {
        const html = editor.getHTML()
        debouncedContentUpdate(html)
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-2'
        }
      }
    }),
    [currentContent, debouncedContentUpdate]
  )

  const editor = useEditor(editorConfig)

  // Update editor content when lesson changes
  useEffect(() => {
    if (editor && currentContent !== editor.getHTML()) {
      editor.commands.setContent(currentContent || "")
    }
  }, [editor, currentContent, selectedModuleId, selectedLessonId])

  // Handle manual save
  const handleSave = useCallback(async () => {
    if (!editor || !selectedLessonId || !course) return;
    
    const content = editor.getHTML()
    setCurrentContent(content)
    setSavedState("saving")
    
    try {
      await updateLesson(selectedLessonId, {
        content_json: {
          content,
          type: 'html',
          version: 1
        }
      })
      setSavedState("saved")
      toast({
        description: "Changes saved successfully"
      })
      onSave()
    } catch (error) {
      console.error('Failed to save content:', error)
      setSavedState("unsaved")
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      })
    }
  }, [editor, selectedLessonId, course?.id, setCurrentContent, setSavedState, updateLesson, onSave, toast])

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedContentUpdate.cancel()
    }
  }, [debouncedContentUpdate])

  return (
    <div className="relative min-h-[500px] rounded-md border border-input bg-background">
      <EditorToolbar editor={editor} onSave={handleSave} />
      <EditorContent editor={editor} />
    </div>
  )
} 