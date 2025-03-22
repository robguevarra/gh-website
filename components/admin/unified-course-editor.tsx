'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit, ExternalLink } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import CourseForm from './course-form';
// @ts-ignore - This module exists but TypeScript can't find it
import CourseModulesManager from './course-modules-manager';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  thumbnail_url: string | null;
  trailer_url: string | null;
  required_tier_id: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessonCount: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  module_id: string;
  position: number;
  content: string | null;
  created_at: string;
  updated_at: string;
  status?: string;
}

interface MembershipTier {
  id: string;
  name: string;
  description?: string;
}

interface UnifiedCourseEditorProps {
  course: Course;
  modules: Module[];
  membershipTiers: MembershipTier[];
}

export function UnifiedCourseEditor({
  course,
  modules,
  membershipTiers,
}: UnifiedCourseEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'basic-info');
  
  // Update active tab when URL params change
  useEffect(() => {
    if (tabParam && ['basic-info', 'modules', 'all-lessons', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update the URL without a full page refresh
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  };
  
  // Transform course data to match CourseForm's initialData format
  const courseInitialData = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description || undefined,
    status: course.status,
    is_featured: course.is_featured,
    thumbnail_url: course.thumbnail_url || '',
    trailer_url: course.trailer_url || '',
    required_tier_id: course.required_tier_id || 'none',
  };

  // Calculate total lesson count across all modules
  const totalLessons = modules.reduce((acc, module) => acc + module.lessonCount, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/courses"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Link>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
          <TabsTrigger value="all-lessons">All Lessons ({totalLessons})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic-info" className="space-y-4">
          <div className="grid gap-4">
            <CourseForm
              initialData={courseInitialData}
              membershipTiers={membershipTiers}
              isEditing={true}
              isUnified={true}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="modules" className="space-y-4">
          <div className="grid gap-4">
            <CourseModulesManager
              courseId={course.id}
              courseTitle={course.title}
              initialModules={modules || []}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="all-lessons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Lessons</span>
                <Badge variant="outline">{totalLessons} Lessons</Badge>
              </CardTitle>
              <CardDescription>
                View and edit all lessons across all modules in this course.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalLessons === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No lessons have been created for this course yet.</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setActiveTab('modules')}
                  >
                    Go to Modules to Add Lessons
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  {modules.map((module) => (
                    <div key={module.id} className="mb-6">
                      <h3 className="font-medium text-lg mb-2 flex items-center">
                        {module.title}
                        <Badge variant="outline" className="ml-2">
                          {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                        </Badge>
                      </h3>
                      <div className="space-y-2">
                        {module.lessons.length === 0 ? (
                          <p className="text-sm text-muted-foreground pl-4 py-2">
                            No lessons in this module
                          </p>
                        ) : (
                          module.lessons.map((lesson) => (
                            <Card key={lesson.id} className="p-0">
                              <div className="flex items-center justify-between p-3">
                                <div>
                                  <h4 className="font-medium">{lesson.title}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {lesson.description || 'No description'}
                                  </p>
                                </div>
                                <div className="flex items-center">
                                  {lesson.status && (
                                    <Badge variant="outline" className={`mr-2 ${
                                      lesson.status === 'published' 
                                        ? 'bg-green-50 text-green-600' 
                                        : 'bg-yellow-50 text-yellow-600'
                                    }`}>
                                      {lesson.status}
                                    </Badge>
                                  )}
                                  <Link href={`/admin/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`}>
                                    <Button size="sm" variant="ghost">
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Course Settings</CardTitle>
                <CardDescription>
                  Additional configuration options for this course.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  More settings coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UnifiedCourseEditor; 