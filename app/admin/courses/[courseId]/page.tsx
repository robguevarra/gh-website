import { CourseEditor } from './_components/CourseEditor'

interface CourseEditorPageProps {
  params: {
    courseId: string
  }
}

export default function CourseEditorPage({ params }: CourseEditorPageProps) {
  return (
    <div className="h-full">
      <CourseEditor courseId={params.courseId} />
    </div>
  )
} 