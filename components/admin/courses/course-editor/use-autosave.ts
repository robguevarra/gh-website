import { useCallback, useEffect, useRef } from 'react'
import { useEditor } from '@tiptap/react'
import { JSONContent } from '@tiptap/react'
import { saveLesson } from '@/app/actions/modules'
import { useToast } from '@/components/ui/use-toast'

interface UseAutosaveProps {
  lessonId: string | null
  editor: ReturnType<typeof useEditor>
  title: string
  description: string
}

export function useAutosave({
  lessonId,
  editor,
  title,
  description,
}: UseAutosaveProps) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastSavedRef = useRef<{
    title: string
    description: string
    content: JSONContent | null
  }>({
    title: '',
    description: '',
    content: null,
  })
  const { toast } = useToast()

  const save = useCallback(async () => {
    if (!lessonId || !editor) return

    const currentContent = editor.getJSON()
    const hasChanges = !lastSavedRef.current ||
      lastSavedRef.current.title !== title ||
      lastSavedRef.current.description !== description ||
      JSON.stringify(lastSavedRef.current.content) !== JSON.stringify(currentContent)

    if (!hasChanges) {
      toast({
        description: 'No changes to save',
      })
      return
    }

    try {
      await saveLesson(lessonId, {
        title,
        description,
        content_json: currentContent,
      })

      // Update last saved state
      lastSavedRef.current = {
        title,
        description,
        content: currentContent,
      }

      toast({
        title: 'Changes saved',
        description: 'Your lesson has been updated successfully.',
      })
    } catch (error) {
      console.error('Error saving lesson:', error)
      toast({
        title: 'Error saving changes',
        description: 'Please try again later.',
        variant: 'destructive',
      })
      throw error
    }
  }, [lessonId, editor, title, description, toast])

  useEffect(() => {
    if (!lessonId || !editor) return

    const debouncedSave = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        save()
      }, 2000) // Autosave after 2 seconds of no changes
    }

    const onUpdate = () => {
      debouncedSave()
    }

    editor.on('update', onUpdate)

    return () => {
      editor.off('update', onUpdate)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [lessonId, editor, save])

  useEffect(() => {
    if (!lessonId) return

    // Debounce title and description changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      save()
    }, 2000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [lessonId, title, description, save])

  return { save }
} 