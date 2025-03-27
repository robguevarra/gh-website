"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Smartphone, Monitor } from 'lucide-react';
import { useCourseStore, Course, Module, Lesson } from '@/lib/stores/course-store';

type EditingItem = {
  type: 'course' | 'module' | 'lesson';
  id: string;
  parentId?: string;
};

type PreviewProps = {
  editingItem: EditingItem | null;
};

type PreviewMode = 'desktop' | 'mobile';

export function Preview({ editingItem }: PreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const { course } = useCourseStore();

  if (!editingItem || !course) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Select an item to preview</p>
      </div>
    );
  }

  const openInNewTab = () => {
    const baseUrl = window.location.origin;
    let previewUrl = '';

    switch (editingItem.type) {
      case 'course':
        previewUrl = `${baseUrl}/courses/${course.id}/preview`;
        break;
      case 'module':
        previewUrl = `${baseUrl}/courses/${course.id}/modules/${editingItem.id}/preview`;
        break;
      case 'lesson':
        previewUrl = `${baseUrl}/courses/${course.id}/lessons/${editingItem.id}/preview`;
        break;
    }

    window.open(previewUrl, '_blank');
  };

  const renderContent = () => {
    if (editingItem.type === 'course') {
      return <CoursePreview course={course} />;
    }

    if (editingItem.type === 'module') {
      const module = course.modules?.find(m => m.id === editingItem.id);
      if (!module) return null;
      return <ModulePreview module={module} />;
    }

    if (editingItem.type === 'lesson') {
      const module = course.modules?.find(m => m.lessons?.some(l => l.id === editingItem.id));
      const lesson = module?.lessons?.find(l => l.id === editingItem.id);
      if (!lesson) return null;
      return <LessonPreview lesson={lesson} />;
    }
  };

  return (
    <Card className="m-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Preview</CardTitle>
        <div className="flex items-center space-x-2">
          <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as PreviewMode)}>
            <TabsList className="grid w-24 grid-cols-2">
              <TabsTrigger value="desktop">
                <Monitor className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="mobile">
                <Smartphone className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={openInNewTab}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`preview-container ${previewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''}`}>
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
}

function CoursePreview({ course }: { course: Course }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        {course.description && (
          <p className="text-muted-foreground mt-2">{course.description}</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
          {course.status}
        </Badge>
      </div>
      {course.modules && course.modules.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Course Modules</h2>
          <div className="space-y-2">
            {course.modules.map((module) => (
              <div key={module.id} className="p-4 border rounded-lg">
                <h3 className="font-medium">{module.title}</h3>
                {module.description && (
                  <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModulePreview({ module }: { module: Module }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{module.title}</h2>
        {module.description && (
          <p className="text-muted-foreground mt-2">{module.description}</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={module.status === 'published' ? 'default' : 'secondary'}>
          {module.status}
        </Badge>
      </div>
      {module.lessons && module.lessons.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Lessons</h3>
          <div className="space-y-2">
            {module.lessons.map((lesson) => (
              <div key={lesson.id} className="p-4 border rounded-lg">
                <h4 className="font-medium">{lesson.title}</h4>
                {lesson.description && (
                  <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LessonPreview({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{lesson.title}</h2>
        {lesson.description && (
          <p className="text-muted-foreground mt-2">{lesson.description}</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={lesson.status === 'published' ? 'default' : 'secondary'}>
          {lesson.status}
        </Badge>
      </div>
      {lesson.content_json && (
        <div className="mt-6 prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ 
            __html: typeof lesson.content_json === 'string' 
              ? lesson.content_json 
              : JSON.stringify(lesson.content_json)
          }} />
        </div>
      )}
    </div>
  );
} 