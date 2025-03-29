'use client'

import { useCallback, useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Plus, GripVertical, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-context'
import { addModule, updateModulePositions } from '@/app/actions/modules'
import type { Module, Lesson } from '@/types/courses'

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

interface SortableModuleProps {
  module: Module
  isExpanded: boolean
  onToggle: () => void
  onSelect: (moduleId: string) => void
  lessons: Lesson[]
  isSelected: boolean
}

// Sortable Module Component
function SortableModule({
  module,
  isExpanded,
  onToggle,
  onSelect,
  lessons,
  isSelected,
}: SortableModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div
        className={cn(
          'flex items-center p-2 rounded hover:bg-accent',
          isSelected && 'bg-accent'
        )}
      >
        <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
          <GripVertical className="w-4 h-4 mr-2 text-muted-foreground" />
        </div>
        <button
          onClick={onToggle}
          className="mr-2"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onSelect(module.id)}
          className="flex-1 text-left"
        >
          {module.title}
        </button>
      </div>

      {isExpanded && (
        <div className="ml-8 mt-1">
          {lessons?.map((lesson) => (
            <div
              key={lesson.id}
              className={cn(
                'flex items-center p-2 rounded hover:bg-accent cursor-pointer',
                lesson.id === module.id && 'bg-accent'
              )}
              onClick={() => onSelect(lesson.id)}
            >
              {lesson.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const ModuleTreeV2 = forwardRef<ModuleTreeHandle, ModuleTreeProps>(({
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const { isAdmin } = useAuth()

  // Configure DnD sensors with constraints
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay for touch
        tolerance: 5, // 5px tolerance during delay
      },
    })
  )

  const loadModules = useCallback(async () => {
    if (!courseId) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Loading modules for course:', courseId)
      const response = await fetch(`/api/courses/${courseId}`)
      if (!response.ok) throw new Error('Failed to fetch course')
      
      const course = await response.json()
      setModules(course.modules || [])
      
      // Create lessons map from the nested data
      const lessonsMap: Record<string, Lesson[]> = {}
      course.modules?.forEach((module: Module) => {
        lessonsMap[module.id] = module.lessons || []
      })
      setLessons(lessonsMap)
      
      console.log('✅ Modules and lessons loaded successfully')
    } catch (err) {
      console.error('❌ Error loading modules:', err)
      setError('Failed to load course content')
      toast.error('Error', {
        description: 'Failed to load course content'
      })
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    try {
      console.log('🔄 Reordering modules:', { from: active.id, to: over.id })
      
      const oldIndex = modules.findIndex(m => m.id === active.id)
      const newIndex = modules.findIndex(m => m.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newModules = [...modules]
        const [movedModule] = newModules.splice(oldIndex, 1)
        newModules.splice(newIndex, 0, movedModule)

        // Optimistically update the UI
        setModules(newModules)

        // Update positions in the database
        const updates = newModules.map((module, index) => ({
          id: module.id,
          position: index,
        }))

        await updateModulePositions(updates)
        console.log('✅ Module positions updated successfully')
      }
    } catch (err) {
      console.error('❌ Error updating module positions:', err)
      // Revert to original order on error
      loadModules()
      toast.error('Error', {
        description: 'Failed to update module positions'
      })
    } finally {
      setActiveId(null)
    }
  }

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
      toast.error('Error', {
        description: 'Only admins can add modules'
      })
      return
    }

    try {
      console.log('🔄 Adding new module to course:', courseId)
      const newModule = await addModule(courseId)
      
      setModules(prev => [...prev, newModule])
      setLessons(prev => ({ ...prev, [newModule.id]: [] }))
      setExpandedModules(prev => new Set(prev).add(newModule.id))
      onModuleSelect(newModule.id)
      
      console.log('✅ New module added successfully:', newModule.id)
      toast.success('Success', {
        description: 'New module added successfully'
      })
    } catch (err) {
      console.error('❌ Error adding module:', err)
      toast.error('Error', {
        description: 'Failed to add module'
      })
    }
  }, [courseId, isAdmin, onModuleSelect])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={modules.map(m => m.id)}
          strategy={verticalListSortingStrategy}
        >
          {modules.map((module) => (
            <SortableModule
              key={module.id}
              module={module}
              isExpanded={expandedModules.has(module.id)}
              onToggle={() => toggleModule(module.id)}
              onSelect={onModuleSelect}
              lessons={lessons[module.id] || []}
              isSelected={module.id === selectedModuleId}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="p-2 rounded bg-background border shadow-lg">
              {modules.find(m => m.id === activeId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isAdmin && (
        <Button
          onClick={handleAddModule}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Module
        </Button>
      )}
    </div>
  )
}) 