"use client"

import { useCallback, useEffect, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useCourseContext } from "../course-editor"
import { useCourseStore } from "@/lib/stores/course"
import { Toolbar } from "./toolbar"
import { useToast } from "@/components/ui/use-toast"
import debounce from "lodash/debounce"

interface RichTextEditorProps {
  initialContent: string
  onSave: () => void
}

export function RichTextEditor({ initialContent, onSave }: RichTextEditorProps) {
  const [content, setContent] = useState(initialContent)
  const { setCurrentContent, setSavedState } = useCourseContext()
  const { selectedLessonId, updateLesson, course } = useCourseStore()
  const { toast } = useToast()

  // Create a debounced save function
  const debouncedSave = useCallback(
    debounce(async (html: string) => {
      if (!selectedLessonId || !course) {
        console.warn('⚠️ [RichTextEditor] Cannot save: No lesson selected or course loaded')
        return
      }

      setCurrentContent(html)
      setSavedState("saving")

      try {
        await updateLesson(selectedLessonId, {
          content_json: {
            type: 'lesson',
            content: html,
            version: Date.now() // Use timestamp for versioning
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
    [selectedLessonId, course, setCurrentContent, setSavedState, updateLesson, toast]
  )

  // Initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { 
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'editor-heading',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'editor-paragraph',
          },
        },
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
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'left',
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setContent(html)
      debouncedSave(html)
      // Log current selection state for debugging
      console.log('Selection:', editor.isActive('heading', { level: 1 }), 
                            editor.isActive('heading', { level: 2 }), 
                            editor.isActive('heading', { level: 3 }))
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg focus:outline-none min-h-[400px] px-4 py-2 max-w-none',
      }
    }
  })

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent !== content) {
      editor.commands.setContent(initialContent)
      setContent(initialContent)
    }
  }, [editor, initialContent])

  // Handle manual save
  const handleSave = useCallback(async () => {
    if (!editor || !selectedLessonId || !course) return;

    const html = editor.getHTML()
    setCurrentContent(html)
    setSavedState("saving")

    try {
      await updateLesson(selectedLessonId, {
        content_json: {
          type: 'lesson',
          content: html,
          version: Date.now() // Use timestamp for versioning
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
  }, [editor, selectedLessonId, course, setCurrentContent, setSavedState, updateLesson, onSave, toast])

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  return (
    <div className="relative min-h-[500px] rounded-md border border-input bg-background">
      <Toolbar editor={editor} onSave={handleSave} />
      <EditorContent editor={editor} className="p-4 rich-text-content" />
      <style jsx global>{`
        .rich-text-content .editor-heading {
          margin-top: 1em;
          margin-bottom: 0.5em;
          font-weight: bold;
        }
        .rich-text-content h1 {
          font-size: 1.8em;
        }
        .rich-text-content h2 {
          font-size: 1.5em;
        }
        .rich-text-content h3 {
          font-size: 1.3em;
        }
        .rich-text-content .editor-paragraph {
          margin-bottom: 1em;
        }
        .rich-text-content [data-text-align="center"] {
          text-align: center;
        }
        .rich-text-content [data-text-align="right"] {
          text-align: right;
        }
        .rich-text-content [data-text-align="left"] {
          text-align: left;
        }
      `}</style>
    </div>
  )
}
