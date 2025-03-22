import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import CourseForm from '@/components/admin/course-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Edit Course | Admin Dashboard',
  description: 'Edit an existing course on the Graceful Homeschooling platform.',
};

export default async function EditCoursePage({
  params,
}: {
  params: { id: string };
}) {
  // Fix the params warning by destructuring
  const { id: courseId } = params;
  
  // Use service role client to bypass RLS
  const serviceClient = createServiceRoleClient();
  
  // Fetch course data
  const { data: course, error: courseError } = await serviceClient
    .from('courses')
    .select(`
      id, 
      title, 
      slug, 
      description, 
      status, 
      is_featured, 
      thumbnail_url,
      trailer_url,
      required_tier_id,
      created_at
    `)
    .eq('id', courseId)
    .single();
  
  // Fetch membership tiers
  const { data: membershipTiers, error: tierError } = await serviceClient
    .from('membership_tiers')
    .select('id, name, description');
  
  // If course not found, show 404
  if (courseError || !course) {
    notFound();
  }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{course.title}</h1>
          <div className="flex items-center space-x-2">
            <Badge variant={course.status === 'published' ? 'default' : 'outline'}>
              {course.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
            <span className="text-muted-foreground text-sm">
              Created on {new Date(course.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/courses/${courseId}/unified`}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Edit Course
          </Link>
        </Button>
      </div>
      
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>Try our new unified course editor!</AlertTitle>
        <AlertDescription className="flex justify-between items-center">
          <span>Manage all aspects of your course in one place with our new enhanced editor.</span>
          <Button asChild size="sm">
            <Link href={`/admin/courses/${courseId}/unified`}>
              Try it now
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
      
      <CourseForm 
        initialData={course} 
        membershipTiers={membershipTiers || []} 
        isEditing
      />
    </div>
  );
} 