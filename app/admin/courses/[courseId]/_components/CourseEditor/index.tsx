"use client";

import { useRef, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourseStore } from '@/lib/stores/course-store';
import { Navigation } from './Navigation';
import { ContentEditor } from './ContentEditor';
import { Preview } from './Preview';
import { ModuleTreeV2, ModuleTreeHandle } from '@/components/admin/courses/course-editor/module-tree-v2';
import { Loader2 } from 'lucide-react';

type EditingItem = {
  type: 'course' | 'module' | 'lesson';
  id: string;
  parentId?: string;
};

interface CourseEditorProps {
  courseId: string;
}

export function CourseEditor({ courseId }: CourseEditorProps) {
  const params = useParams();
  // Ensure courseId exists and is a string
  const courseIdStr = typeof params.courseId === 'string' ? params.courseId : '';
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const { course, fetchCourse, selectedModuleId, selectedLessonId, selectModule, selectLesson } = useCourseStore();
  const moduleTreeRef = useRef<ModuleTreeHandle>(null);

  useEffect(() => {
    const loadCourse = async () => {
      setIsLoading(true);
      try {
        await fetchCourse(courseId);
        // Initially set the course as the editing item
        setEditingItem({ type: 'course', id: courseId });
      } catch (error) {
        console.error('Error loading course:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCourse();
  }, [courseId, fetchCourse]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-4rem)]">
      <div className="border-r pr-4 overflow-y-auto">
        <ModuleTreeV2
          ref={moduleTreeRef}
          courseId={courseId}
          selectedModuleId={selectedModuleId}
          selectedLessonId={selectedLessonId}
          onModuleSelect={selectModule}
          onLessonSelect={selectLesson}
        />
      </div>
      <div className="overflow-y-auto px-4">
        <ContentEditor
          moduleTreeRef={moduleTreeRef}
          editingItem={editingItem}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25}>
          <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-5/6" />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40}>
          <div className="p-4 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={35}>
          <div className="p-4 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 