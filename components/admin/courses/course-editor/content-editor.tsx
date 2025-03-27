'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { extensions } from './tiptap-extensions'
import { EditorToolbar } from './editor-toolbar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAutosave } from './use-autosave'
import { fetchLesson } from '@/app/actions/modules'

// Client-side only wrapper component
function ClientOnlyEditor({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return <EditorContent editor={editor} />
}

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editor = useEditor({
    extensions,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[200px] max-w-none',
      },
    },
    immediatelyRender: false,
  })

  const { save } = useAutosave({
    lessonId: selectedLessonId,
    editor,
    title,
    description,
  })

  useEffect(() => {
    const fetchContent = async () => {
      if (!selectedLessonId) return

      setIsLoading(true)
      setError(null)
      
      try {
        const lesson = await fetchLesson(selectedLessonId)
        
        setTitle(lesson.title)
        setDescription(lesson.description || '')
        editor?.commands.setContent(lesson.content_json || '')
      } catch (err) {
        console.error('Error fetching lesson:', err)
        setError('Failed to load lesson content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [selectedLessonId, editor])

  const handleManualSave = async () => {
    if (!selectedLessonId) return

    setIsSaving(true)
    try {
      await save()
    } catch (err) {
      console.error('Error saving lesson:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    )
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
          onClick={handleManualSave}
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

      <div className={cn('border rounded-lg overflow-hidden')}>
        <EditorToolbar editor={editor} courseId={courseId} />
        <div className="p-4">
          <ClientOnlyEditor editor={editor} />
        </div>
      </div>
    </div>
  )
} 