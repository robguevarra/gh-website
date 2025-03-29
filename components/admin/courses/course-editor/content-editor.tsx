'use client'

import { useEffect, useState, useRef, RefObject } from 'react'
import { toast } from 'sonner'
import { Editor } from './editor'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useCourseStore } from '@/lib/stores/course-store'
import { useAutosave } from './use-autosave'
import type { ModuleTreeHandle } from './module-tree-v2'

interface ContentEditorProps {
  moduleTreeRef: RefObject<ModuleTreeHandle>
}

export function ContentEditor({ moduleTreeRef }: ContentEditorProps) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { 
    course, 
    selectedModuleId, 
    selectedLessonId,
    updateModule,
    updateLesson 
  } = useCourseStore()

  // Get the currently selected item
  const selectedModule = course?.modules?.find(m => m.id === selectedModuleId)
  const selectedLesson = selectedModule?.lessons?.find(l => l.id === selectedLessonId)
  const selectedItem = selectedLessonId ? selectedLesson : selectedModule

  // Update local state when selection changes
  useEffect(() => {
    if (selectedItem) {
      setTitle(selectedItem.title || '')
      setContent((selectedItem.content_json as any)?.content || '')
    }
  }, [selectedItem])

  const handleSave = async () => {
    if (!selectedItem) return

    setIsSaving(true)
    try {
      const data = { 
        title, 
        content_json: { content } 
      }
      if (selectedLessonId) {
        await updateLesson(selectedLessonId, data)
      } else if (selectedModuleId) {
        await updateModule(selectedModuleId, data)
      }
      
      // Refresh the module tree to show updated titles
      await moduleTreeRef.current?.refresh()
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Error', {
        description: 'Failed to save changes'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Setup autosave
  useAutosave({
    data: { title, content },
    onSave: handleSave,
    interval: 3000,
    enabled: !!selectedItem,
  })

  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a module or lesson to edit</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold bg-transparent border-none focus:outline-none"
          placeholder="Enter title..."
        />
        <Button 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save
        </Button>
      </div>
      <Editor
        value={content}
        onChange={setContent}
        placeholder="Start writing your content..."
      />
    </div>
  )
} 