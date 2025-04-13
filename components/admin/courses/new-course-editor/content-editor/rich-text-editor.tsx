"use client"

import { useCallback, useEffect, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { Vimeo } from "./extensions/vimeo"
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
        bulletList: {
          HTMLAttributes: {
            class: 'editor-bullet-list',
          },
          keepMarks: true,
          keepAttributes: true, // Keep all marks and attributes when toggling lists
        },
        orderedList: {
          HTMLAttributes: {
            class: 'editor-ordered-list',
          },
          keepMarks: true,
          keepAttributes: true, // Keep all marks and attributes when toggling lists
        },
        listItem: {
          HTMLAttributes: {
            class: 'editor-list-item',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'editor-blockquote',
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
      Vimeo.configure({
        HTMLAttributes: {
          class: "vimeo-embed"
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'bulletList', 'orderedList', 'blockquote'],
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
      },
      // Handle keyboard shortcuts
      handleKeyDown: (view, event) => {
        // Tab for nested lists
        if (event.key === 'Tab') {
          if (editor?.isActive('listItem')) {
            // Prevent default tab behavior
            event.preventDefault()

            // If Shift is pressed, outdent
            if (event.shiftKey) {
              editor.chain().focus().liftListItem('listItem').run()
            } else {
              // Otherwise, indent
              editor.chain().focus().sinkListItem('listItem').run()
            }
            return true
          }
        }

        // Keyboard shortcuts for lists and quotes
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case '.':
              // Ctrl+. for bullet list
              event.preventDefault()
              editor?.chain().focus().toggleBulletList().run()
              return true
            case '/':
              // Ctrl+/ for ordered list
              event.preventDefault()
              editor?.chain().focus().toggleOrderedList().run()
              return true
            case '\'':
              // Ctrl+' for blockquote
              event.preventDefault()
              editor?.chain().focus().toggleBlockquote().run()
              return true
          }
        }

        return false
      },
      // Allow all HTML content including iframes
      transformPastedHTML: (html) => {
        return html
      },
      // Allow pasting of HTML content with iframes
      handlePaste: (view, event, slice) => {
        // Let TipTap handle the paste normally
        return false
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

  /**
   * Event listener for editor-save event
   *
   * This follows the optimistic UI pattern:
   * 1. Immediately sync editor content to context (for instant UI updates)
   * 2. Start a background save operation to persist to database
   * 3. Update UI state based on the result of the save operation
   */
  useEffect(() => {
    // Create a stable reference to the current editor instance
    const currentEditor = editor

    const handleEditorSave = () => {
      if (!currentEditor) return

      // Get the current HTML content from the editor
      const html = currentEditor.getHTML()

      // Immediately update the context with the latest content
      // This ensures the student view will have access to the latest content
      setCurrentContent(html)

      // Only attempt to save to database if we have a lesson selected
      if (selectedLessonId) {
        // Set UI state to saving
        setSavedState("saving")

        // Start a background save operation
        updateLesson(selectedLessonId, {
          content_json: {
            type: 'lesson',
            content: html,
            version: Date.now()
          }
        }).then(() => {
          // Update UI state on success
          setSavedState("saved")

          // Notify the user (optional in this case since we're switching views)
          toast({
            description: "Changes saved successfully"
          })

          // Call the onSave callback
          onSave()
        }).catch(error => {
          // Handle errors
          console.error('Failed to save content:', error)
          setSavedState("unsaved")

          // Notify the user of the error
          toast({
            title: "Error",
            description: "Failed to save changes. Please try again.",
            variant: "destructive"
          })
        })
      }
    }

    // Listen for the editor-save event
    window.addEventListener('editor-save', handleEditorSave)

    // Cleanup function
    return () => {
      // Cancel any pending debounced saves
      if (debouncedSave && typeof debouncedSave.cancel === 'function') {
        debouncedSave.cancel()
      }

      // Remove the event listener
      window.removeEventListener('editor-save', handleEditorSave)
    }
  }, [editor, selectedLessonId, onSave, setCurrentContent, setSavedState, updateLesson, toast])

  return (
    <div className="relative min-h-[500px] rounded-md border border-input bg-background">
      <Toolbar editor={editor} onSave={handleSave} />
      <EditorContent editor={editor} className="p-4 rich-text-content" />
      <style jsx global>{`
        /* Vimeo embed styling */
        .rich-text-content .vimeo-embed {
          margin: 1.5em 0;
          border-radius: 0.5rem;
          overflow: hidden;
        }
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
        /* Bullet list styling */
        .rich-text-content .editor-bullet-list {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 1em 0;
        }
        /* Nested bullet lists */
        .rich-text-content .editor-bullet-list .editor-bullet-list {
          list-style-type: circle;
          margin: 0.5em 0 0.5em 1em;
        }
        /* Deeply nested bullet lists */
        .rich-text-content .editor-bullet-list .editor-bullet-list .editor-bullet-list {
          list-style-type: square;
        }
        /* Ordered list styling */
        .rich-text-content .editor-ordered-list {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 1em 0;
        }
        /* Nested ordered lists */
        .rich-text-content .editor-ordered-list .editor-ordered-list {
          list-style-type: lower-alpha;
          margin: 0.5em 0 0.5em 1em;
        }
        /* Deeply nested ordered lists */
        .rich-text-content .editor-ordered-list .editor-ordered-list .editor-ordered-list {
          list-style-type: lower-roman;
        }
        /* List item styling */
        .rich-text-content .editor-list-item {
          margin-bottom: 0.5em;
        }
        /* Blockquote styling */
        .rich-text-content .editor-blockquote {
          border-left: 4px solid #e2e8f0;
          padding: 0.5em 1em;
          margin: 1em 0;
          font-style: italic;
          color: #4a5568;
          background-color: rgba(226, 232, 240, 0.2);
          border-radius: 0.25em;
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
