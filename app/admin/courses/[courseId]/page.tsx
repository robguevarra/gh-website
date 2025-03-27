import { notFound } from 'next/navigation'
import { CourseEditor } from '@/components/admin/courses/course-editor'
import { adminDb } from '@/lib/supabase/admin'

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const { courseId } = params
  
  console.log('Server: Fetching course data for courseId:', courseId)
  
  const { data: course, error } = await adminDb.courses.getById(courseId)
  
  if (error || !course) {
    console.error('Server: Error fetching course:', error)
    notFound()
  }
  
  console.log('Server: Successfully fetched course:', course)
  
  return (
    <div className="container mx-auto py-6">
      <CourseEditor course={course} />
    </div>
  )
} 