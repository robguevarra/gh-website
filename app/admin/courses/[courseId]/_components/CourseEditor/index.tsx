"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourseStore } from '@/lib/stores/course-store';
import { Navigation } from './Navigation';
import { ContentEditor } from './ContentEditor';
import { Preview } from './Preview';

type EditingItem = {
  type: 'course' | 'module' | 'lesson';
  id: string;
  parentId?: string;
};

export function CourseEditor() {
  const params = useParams();
  // Ensure courseId exists and is a string
  const courseId = typeof params.courseId === 'string' ? params.courseId : '';
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const { course, fetchCourse } = useCourseStore();

  useEffect(() => {
    if (!courseId) return;
    
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
    return <LoadingSkeleton />;
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <ResizablePanelGroup direction="horizontal">
        {/* Navigation Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
          <ScrollArea className="h-full">
            <Navigation
              course={course}
              editingItem={editingItem}
              onSelectItem={setEditingItem}
            />
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle />

        {/* Content Editor Panel */}
        <ResizablePanel defaultSize={40}>
          <ScrollArea className="h-full">
            <ContentEditor
              editingItem={editingItem}
              onSave={() => courseId && fetchCourse(courseId)}
            />
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle />

        {/* Preview Panel */}
        <ResizablePanel defaultSize={35}>
          <ScrollArea className="h-full">
            <Preview editingItem={editingItem} />
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
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