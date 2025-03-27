'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentEditorProps {
  courseId: string
  selectedModuleId: string | null
  selectedLessonId: string | null
}

export function ContentEditor({
  courseId,
  selectedModuleId,
  selectedLessonId,
}: ContentEditorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your lesson content...',
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
      },
    },
  })

  useEffect(() => {
    const fetchContent = async () => {
      if (!selectedLessonId) return

      const { data: lesson } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', selectedLessonId)
        .single()

      if (lesson) {
        setTitle(lesson.title)
        setDescription(lesson.description || '')
        editor?.commands.setContent(lesson.content_json || '')
      }
    }

    fetchContent()
  }, [selectedLessonId])

  const handleSave = async () => {
    if (!selectedLessonId) return

    setIsSaving(true)
    try {
      const content = editor?.getJSON()
      await supabase
        .from('lessons')
        .update({
          title,
          description,
          content_json: content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLessonId)
    } catch (error) {
      console.error('Error saving lesson:', error)
    }
    setIsSaving(false)
  }

  if (!selectedLessonId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a lesson to start editing
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson title"
            className="text-lg font-semibold"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Lesson description"
            className="resize-none"
            rows={2}
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="ml-4"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
      </div>

      <div className={cn('border rounded-lg p-4', editor && 'min-h-[500px]')}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
} 