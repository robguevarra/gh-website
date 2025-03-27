"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface LessonPageProps {
  params: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  };
}

export default function LessonRedirect({ params }: LessonPageProps) {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the unified editor with module and lesson ID as query parameters
    router.replace(`/admin/courses/${params.courseId}/unified?module=${params.moduleId}&lesson=${params.lessonId}`);
  }, [router, params.courseId, params.moduleId, params.lessonId]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Redirecting to unified editor...</span>
    </div>
  );
} 