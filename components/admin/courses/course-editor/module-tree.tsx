import { useEffect, useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { Module, Lesson } from '@/types/courses'
import { Button } from '@/components/ui/button'
import { Plus, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface ModuleTreeProps {
  courseId: string
  selectedModuleId: string | null
  selectedLessonId: string | null
  onModuleSelect: (moduleId: string) => void
  onLessonSelect: (lessonId: string) => void
}

export function ModuleTree({
  courseId,
  selectedModuleId,
  selectedLessonId,
  onModuleSelect,
  onLessonSelect,
}: ModuleTreeProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const supabase = createClient()

  // Fetch modules and lessons
  useEffect(() => {
    const fetchModules = async () => {
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('position')

      if (modulesData) {
        setModules(modulesData)
        
        // Fetch lessons for each module
        const lessonsPromises = modulesData.map(module =>
          supabase
            .from('lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('position')
        )

        const lessonsResults = await Promise.all(lessonsPromises)
        const lessonsMap: Record<string, Lesson[]> = {}
        
        modulesData.forEach((module, index) => {
          lessonsMap[module.id] = lessonsResults[index].data || []
        })
        
        setLessons(lessonsMap)
      }
    }

    fetchModules()
  }, [courseId])

  const handleDragEnd = async (result: any) => {
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

      await supabase.from('modules').upsert(updates)
      setModules(newModules)
    } else if (type === 'lesson') {
      const moduleId = result.source.droppableId.split('-')[1]
      const newLessons = Array.from(lessons[moduleId])
      const [removed] = newLessons.splice(sourceIndex, 1)
      newLessons.splice(destinationIndex, 0, removed)

      // Update positions in the database
      const updates = newLessons.map((lesson, index) => ({
        id: lesson.id,
        position: index,
      }))

      await supabase.from('lessons').upsert(updates)
      setLessons({ ...lessons, [moduleId]: newLessons })
    }
  }

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const handleAddModule = async () => {
    const { data: newModule } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title: 'New Module',
        position: modules.length,
      })
      .select()
      .single()

    if (newModule) {
      setModules([...modules, newModule])
      setLessons({ ...lessons, [newModule.id]: [] })
    }
  }

  const handleAddLesson = async (moduleId: string) => {
    const { data: newLesson } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: 'New Lesson',
        position: lessons[moduleId]?.length || 0,
        status: 'draft',
      })
      .select()
      .single()

    if (newLesson) {
      setLessons({
        ...lessons,
        [moduleId]: [...(lessons[moduleId] || []), newLesson],
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Course Structure</h3>
        <Button size="sm" onClick={handleAddModule}>
          <Plus className="w-4 h-4 mr-1" />
          Add Module
        </Button>
      </div>

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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddLesson(module.id)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {expandedModules.has(module.id) && (
                        <Droppable droppableId={`lessons-${module.id}`}>
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="ml-8 mt-1"
                            >
                              {lessons[module.id]?.map((lesson, index) => (
                                <Draggable
                                  key={lesson.id}
                                  draggableId={`lesson-${lesson.id}`}
                                  index={index}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        'flex items-center p-2 rounded hover:bg-accent',
                                        selectedLessonId === lesson.id && 'bg-accent'
                                      )}
                                      onClick={() => onLessonSelect(lesson.id)}
                                    >
                                      <GripVertical className="w-4 h-4 mr-2 text-muted-foreground" />
                                      {lesson.title}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
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
    </div>
  )
} 