import CourseEditor from "./course-editor"
import { ToastProvider } from "@/hooks/use-toast"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <ToastProvider>
        <CourseEditor />
      </ToastProvider>
    </main>
  )
}

