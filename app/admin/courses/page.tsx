"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createServiceRoleClient } from "@/lib/supabase/service-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Eye, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useCourseStore } from '@/lib/stores/course';

interface Course {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  slug?: string;
}

export default function CoursesPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();
  const clearCourseStore = useCourseStore(state => state.clearCache);

  // Clear course store on mount
  useEffect(() => {
    console.log('🧹 [Courses] Clearing course store');
    clearCourseStore();
  }, []);

  useEffect(() => {
    // Check authentication and admin status
    if (!isAuthLoading && (!user || !isAdmin)) {
      router.replace('/auth/signin');
      return;
    }
  }, [user, isAdmin, isAuthLoading, router]);

  useEffect(() => {
    async function loadCourses() {
      try {
        if (!user || !isAdmin) return;
        
        setIsLoading(true);
        setError(null);

        // Use a direct API call to the admin courses endpoint instead of service client
        const response = await fetch('/api/admin/courses');
        if (!response.ok) {
          throw new Error(`API error: ${response.status} - ${await response.text()}`);
        }
        
        const data = await response.json();
        console.log('API courses response:', data);
        
        setCourses(data.courses || []);
      } catch (err: any) {
        console.error('Error in loadCourses:', err);
        setError(err?.message || 'Failed to load courses');
      } finally {
        setIsLoading(false);
      }
    }

    if (!isAuthLoading) {
      loadCourses();
    }
  }, [supabase, user, isAdmin, isAuthLoading]);

  const handleEditCourse = (courseId: string) => {
    // Clear any existing course data
    clearCourseStore();
    // Navigate to course editor
    router.push(`/admin/courses/${courseId}`);
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading courses...</span>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. You must be an administrator to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-2">
            Manage your course content and structure
          </p>
        </div>
        <Button onClick={() => router.push('/admin/courses/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <span className="truncate">{course.title}</span>
                <Badge 
                  variant={
                    course.status === 'published' ? 'default' :
                    course.status === 'draft' ? 'secondary' : 'outline'
                  }
                  className="ml-2"
                >
                  {course.status}
                </Badge>
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {course.description || 'No description provided'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-sm text-muted-foreground">
                <p>Created: {new Date(course.created_at).toLocaleDateString()}</p>
                <p>Last updated: {new Date(course.updated_at).toLocaleDateString()}</p>
                {course.slug && <p className="truncate">Slug: {course.slug}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              {course.status === 'published' && (
                <Button variant="outline" asChild>
                  <Link href={`/courses/${course.slug}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Link>
                </Button>
              )}
              <Button onClick={() => handleEditCourse(course.id)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </CardFooter>
          </Card>
        ))}

        {courses.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No courses found</p>
            <Button onClick={() => {
              clearCourseStore();
              router.push('/admin/courses/new');
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first course
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 