"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { use } from "react";

interface UnifiedPageProps {
  params: Promise<{ courseId: string }>;
}

export default function UnifiedPage({ params }: UnifiedPageProps) {
  const router = useRouter();
  const { courseId } = use(params);
  
  useEffect(() => {
    if (!courseId) return;
    // Redirect to the new course editor
    router.replace(`/admin/courses/${courseId}`);
  }, [router, courseId]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Redirecting to new course editor...</span>
    </div>
  );
} 