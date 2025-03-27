"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface CourseEditPageProps {
  params: {
    courseId: string;
  };
}

export default function CourseEditRedirect({ params }: CourseEditPageProps) {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new course editor
    router.replace(`/admin/courses/${params.courseId}`);
  }, [router, params.courseId]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Redirecting to course editor...</span>
    </div>
  );
} 