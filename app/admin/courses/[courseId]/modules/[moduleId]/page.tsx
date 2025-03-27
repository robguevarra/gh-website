"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ModulePageProps {
  params: {
    courseId: string;
    moduleId: string;
  };
}

export default function ModuleRedirect({ params }: ModulePageProps) {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the unified editor with the module ID as a query parameter
    router.replace(`/admin/courses/${params.courseId}/unified?module=${params.moduleId}`);
  }, [router, params.courseId, params.moduleId]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Redirecting to unified editor...</span>
    </div>
  );
} 