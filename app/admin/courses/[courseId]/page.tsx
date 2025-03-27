import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CourseEditor } from '@/components/admin/courses/course-editor'

interface CoursePageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (!course) {
    notFound()
  }

  return (
    <div className="h-full">
      <CourseEditor course={course} />
    </div>
  )
} 