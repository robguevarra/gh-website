'use client'

import { useEffect, useState, useTransition, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { Module, Lesson } from '@/types/courses'
import { Button } from '@/components/ui/button'
import { Plus, GripVertical, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-context'
import { fetchModules, fetchLessons, addModule, updateModulePositions } from '@/app/actions/modules'

interface ModuleTreeProps {
  courseId: string
  selectedModuleId: string | null
  selectedLessonId: string | null
  onModuleSelect: (moduleId: string) => void
  onLessonSelect: (lessonId: string) => void
}

export interface ModuleTreeHandle {
  refresh: () => Promise<void>
}

export const ModuleTree = forwardRef<ModuleTreeHandle, ModuleTreeProps>(({
  courseId,
  selectedModuleId,
  selectedLessonId,
  onModuleSelect,
  onLessonSelect,
}, ref) => {
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { isAdmin } = useAuth()

  const loadModules = useCallback(async () => {
    if (!courseId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const modulesData = await fetchModules(courseId)
      setModules(modulesData)
      
      // Fetch lessons for each module
      const lessonsMap: Record<string, Lesson[]> = {}
      await Promise.all(
        modulesData.map(async (module) => {
          const lessonData = await fetchLessons(module.id)
          lessonsMap[module.id] = lessonData
        })
      )
      
      setLessons(lessonsMap)
    } catch (err) {
      console.error('Error loading modules:', err)
      setError('Failed to load course content')
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  // Expose refresh method through ref
  useImperativeHandle(ref, () => ({
    refresh: loadModules
  }), [loadModules])

  // Initial load
  useEffect(() => {
    loadModules()
  }, [loadModules])

  const handleDragEnd = useCallback(async (result: any) => {
    if (!result.destination) return

    const [type, id] = result.draggableId.split('-')
    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (type === 'module') {
      const newModules = Array.from(modules)
      const [removed] = newModules.splice(sourceIndex, 1)
      newModules.splice(destinationIndex, 0, removed)

      // Update positions in the database
      const updates = newModules.map((module, index) => ({
        id: module.id,
        position: index,
      }))

      startTransition(async () => {
        try {
          await updateModulePositions(updates)
          setModules(newModules)
        } catch (err) {
          console.error('Error updating module positions:', err)
          setError('Failed to update module positions')
        }
      })
    }
  }, [modules])

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(moduleId)) {
        newExpanded.delete(moduleId)
      } else {
        newExpanded.add(moduleId)
      }
      return newExpanded
    })
  }, [])

  const handleAddModule = useCallback(async () => {
    if (!isAdmin) {
      setError('Only admins can add modules')
      return
    }

    startTransition(async () => {
      try {
        const newModule = await addModule(courseId)
        setModules(prev => [...prev, newModule])
        setLessons(prev => ({ ...prev, [newModule.id]: [] }))
        setExpandedModules(prev => new Set(prev).add(newModule.id))
        onModuleSelect(newModule.id)
      } catch (err) {
        console.error('Error adding module:', err)
        setError('Failed to add module')
      }
    })
  }, [courseId, isAdmin, onModuleSelect])

  const modulesList = useMemo(() => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="modules">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {modules.map((module, index) => (
              <Draggable
                key={module.id}
                draggableId={`module-${module.id}`}
                index={index}
              >
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className="mb-2"
                  >
                    <div
                      className={cn(
                        'flex items-center p-2 rounded hover:bg-accent',
                        selectedModuleId === module.id && 'bg-accent'
                      )}
                    >
                      <div {...provided.dragHandleProps}>
                        <GripVertical className="w-4 h-4 mr-2 text-muted-foreground" />
                      </div>
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="mr-2"
                      >
                        {expandedModules.has(module.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onModuleSelect(module.id)}
                        className="flex-1 text-left"
                      >
                        {module.title}
                      </button>
                    </div>

                    {expandedModules.has(module.id) && (
                      <div className="ml-8 mt-1">
                        {lessons[module.id]?.map((lesson) => (
                          <div
                            key={lesson.id}
                            className={cn(
                              'flex items-center p-2 rounded hover:bg-accent cursor-pointer',
                              selectedLessonId === lesson.id && 'bg-accent'
                            )}
                            onClick={() => onLessonSelect(lesson.id)}
                          >
                            {lesson.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  ), [modules, lessons, expandedModules, selectedModuleId, selectedLessonId, handleDragEnd, toggleModule, onModuleSelect, onLessonSelect])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading course content...</span>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Course Structure</h3>
        <Button size="sm" onClick={handleAddModule} disabled={isPending}>
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1" />
          )}
          Add Module
        </Button>
      </div>

      {modulesList}
    </div>
  )
}) 