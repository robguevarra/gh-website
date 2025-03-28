"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCourseStore, type Course, type Module, type Lesson } from '@/lib/stores/course-store';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type EditingItem = {
  type: 'course' | 'module' | 'lesson';
  id: string;
  moduleId?: string;
};

type NavigationProps = {
  onSelect: (item: EditingItem) => void;
};

type ModuleItemProps = {
  module: Module;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (item: EditingItem) => void;
  lessons?: Lesson[];
};

type LessonItemProps = {
  lesson: Lesson;
  moduleId: string;
  onSelect: (item: EditingItem) => void;
};

export function Navigation({ onSelect }: NavigationProps) {
  const course = useCourseStore((state: { course: Course | null }) => state.course);
  const reorderModule = useCourseStore((state: { reorderModule: (oldIndex: number, newIndex: number) => Promise<void> }) => state.reorderModule);
  const reorderLesson = useCourseStore((state: { reorderLesson: (moduleId: string, oldIndex: number, newIndex: number) => Promise<void> }) => state.reorderLesson);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 5px of movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay before touch drag starts
        tolerance: 5, // 5px of movement allowed during delay
      },
    })
  );

  if (!course) return null;

  const handleModuleClick = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle module reordering
    if (activeId.startsWith('module-') && overId.startsWith('module-')) {
      const oldIndex = course.modules?.findIndex(
        (m) => `module-${m.id}` === activeId
      ) ?? -1;
      const newIndex = course.modules?.findIndex(
        (m) => `module-${m.id}` === overId
      ) ?? -1;
      
      if (oldIndex !== -1 && newIndex !== -1) {
        await reorderModule(oldIndex, newIndex);
      }
    }
    // Handle lesson reordering
    else if (activeId.startsWith('lesson-') && overId.startsWith('lesson-')) {
      const [, moduleId, lessonId] = activeId.split('-');
      const module = course.modules?.find((m) => m.id === moduleId);
      if (!module?.lessons) return;

      const oldIndex = module.lessons.findIndex((l) => l.id === lessonId);
      const newIndex = module.lessons.findIndex(
        (l) => `lesson-${moduleId}-${l.id}` === overId
      );
      
      if (oldIndex !== -1 && newIndex !== -1) {
        await reorderLesson(moduleId, oldIndex, newIndex);
      }
    }

    setActiveId(null);
  };

  return (
    <div className="w-full space-y-2">
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => onSelect({ type: 'course', id: course.id })}
      >
        <ChevronRight className="mr-2 h-4 w-4" />
        {course.title}
      </Button>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-1">
          {course.modules?.map((module) => (
            <ModuleItem
              key={module.id}
              module={module}
              isExpanded={expandedModules.has(module.id)}
              onToggle={() => handleModuleClick(module.id)}
              onSelect={onSelect}
              lessons={module.lessons}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function ModuleItem({
  module,
  isExpanded,
  onToggle,
  onSelect,
  lessons,
}: ModuleItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `module-${module.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start group"
          onClick={() => onSelect({ type: 'module', id: module.id })}
        >
          <div {...attributes} {...listeners} className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="mr-2 h-4 w-4" />
          </div>
          <ChevronDown
            className={cn(
              'mr-2 h-4 w-4 transition-transform',
              isExpanded ? 'rotate-0' : '-rotate-90'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          />
          {module.title}
        </Button>
      </div>

      {isExpanded && lessons && (
        <div className="ml-6 mt-1 space-y-1">
          <SortableContext
            items={lessons.map((l) => `lesson-${module.id}-${l.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {lessons.map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                moduleId={module.id}
                onSelect={onSelect}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

function LessonItem({ lesson, moduleId, onSelect }: LessonItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `lesson-${moduleId}-${lesson.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start group"
        onClick={() => onSelect({ type: 'lesson', id: lesson.id, moduleId })}
      >
        <div {...attributes} {...listeners} className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="mr-2 h-4 w-4" />
        </div>
        {lesson.title}
      </Button>
    </div>
  );
}