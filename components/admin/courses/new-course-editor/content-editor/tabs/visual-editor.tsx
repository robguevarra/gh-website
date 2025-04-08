"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { Iframe } from "../extensions/iframe"
import { VimeoEmbed } from "../extensions/vimeo-embed"
import { useCourseContext } from "../../course-editor"
import { useCourseStore } from "@/lib/stores/course"
import { Toolbar } from "../toolbar"
import debounce from "lodash/debounce"
import { useToast } from "@/components/ui/use-toast"

interface VisualEditorProps {
  onSave: () => void
}

export function VisualEditor({ onSave }: VisualEditorProps) {
  const { currentContent, setCurrentContent, setSavedState } = useCourseContext()
  const { toast } = useToast()
  const {
    // selectedModuleId not used but kept for reference
    selectedLessonId,
    updateLesson,
    course
  } = useCourseStore()

  // Keep track of whether we're currently updating the editor content
  const isUpdatingContent = useRef(false)

  // Keep track of the last selected lesson ID to detect changes
  const lastLessonIdRef = useRef<string | null>(null)

  // Debounce content updates
  const debouncedContentUpdate = useMemo(
    () =>
      debounce(async (html: string) => {
        // Skip if we're updating the editor content programmatically
        if (isUpdatingContent.current) {
          return
        }

        if (!selectedLessonId || !course) {
          console.warn('⚠️ [VisualEditor] Cannot save: No lesson selected or course loaded')
          return
        }

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
          bulletList: {},
          orderedList: {},
          blockquote: {},
          code: {},
          codeBlock: {},
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
        }),
        Iframe.configure({
          allowFullscreen: true,
          HTMLAttributes: {
            class: "iframe-wrapper"
          }
        }),
        VimeoEmbed.configure({
          HTMLAttributes: {
            class: "vimeo-embed"
          }
        })
      ],
      // Only set initial content, updates will be handled by the useEffect
      content: "<p>Start writing your content...</p>",
      onUpdate: ({ editor }: { editor: Editor }) => {
        // Skip if we're updating the editor content programmatically
        if (isUpdatingContent.current) {
          return
        }

        const html = editor.getHTML()
        debouncedContentUpdate(html)
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-2'
        },
        // Allow pasting of HTML content with iframes
        handlePaste: (view, event, slice) => {
          // Let TipTap handle the paste normally
          return false
        },
        // Allow all HTML content including iframes
        transformPastedHTML: (html) => {
          return html
        }
      }
    }),
    [debouncedContentUpdate] // Remove currentContent dependency
  )

  const editor = useEditor(editorConfig)

  // Debug editor initialization
  useEffect(() => {
    if (editor) {
      console.log('🔍 [VisualEditor] Editor initialized:', {
        isEditable: editor.isEditable,
        commands: Object.keys(editor.commands),
        extensions: editor.extensionManager.extensions.map(ext => ext.name)
      })
    }
  }, [editor])

  // Update editor content when currentContent changes or lesson changes
  useEffect(() => {
    if (!editor) return

    // Check if the lesson ID has changed
    const lessonChanged = lastLessonIdRef.current !== selectedLessonId
    lastLessonIdRef.current = selectedLessonId

    // Get current editor content
    const editorContent = editor.getHTML()

    // Only update if content has changed or lesson has changed
    if (currentContent !== editorContent || lessonChanged) {
      console.log('📝 [VisualEditor] Setting editor content:', {
        content: currentContent?.substring(0, 50) + (currentContent && currentContent.length > 50 ? '...' : '') || 'empty',
        lessonChanged,
        lessonId: selectedLessonId
      })

      // Set flag to prevent triggering onUpdate while we're updating content
      isUpdatingContent.current = true

      // Set content with fallback - use "New lesson content goes here" for new lessons
      editor.commands.setContent(currentContent || "<p>New lesson content goes here</p>")

      // Reset flag after a short delay to ensure the update has completed
      setTimeout(() => {
        isUpdatingContent.current = false
      }, 50)
    }
  }, [editor, currentContent, selectedLessonId])

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
      <Toolbar editor={editor} onSave={handleSave} />
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="flex items-center justify-center h-[500px]">
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      )}
    </div>
  )
}