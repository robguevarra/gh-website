import CourseEditor from '@/components/admin/courses/new-course-editor/course-editor';
import { ToastProvider } from '@/hooks/use-toast';
import { use } from 'react';

interface CourseEditorPageProps {
  params: Promise<{
    courseId: string
  }>
}

export default function CourseEditorPage({ params }: CourseEditorPageProps) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);

  return (
    <div className="h-full">
      <ToastProvider>
        <CourseEditor courseId={resolvedParams.courseId} />
      </ToastProvider>
    </div>
  )
} 