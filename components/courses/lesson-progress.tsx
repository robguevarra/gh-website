'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface LessonProgressProps {
  lessonId: string;
  courseSlug: string;
  nextLessonId?: string;
  isLastLesson: boolean;
  initialProgress?: {
    completion_percentage: number;
    is_completed: boolean;
  };
}

export function LessonProgress({
  lessonId,
  courseSlug,
  nextLessonId,
  isLastLesson,
  initialProgress,
}: LessonProgressProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  // State for tracking progress
  const [progress, setProgress] = useState({
    completion_percentage: initialProgress?.completion_percentage || 0,
    is_completed: initialProgress?.is_completed || false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch current progress on component mount if not provided
  useEffect(() => {
    if (!initialProgress) {
      fetchProgress();
    }
  }, [lessonId]);
  
  // Update state when initialProgress changes (for navigation between lessons)
  useEffect(() => {
    if (initialProgress) {
      setProgress({
        completion_percentage: initialProgress.completion_percentage,
        is_completed: initialProgress.is_completed,
      });
    }
  }, [initialProgress]);
  
  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/courses/progress?lessonId=${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.progress) {
          setProgress({
            completion_percentage: data.progress.completion_percentage || 0,
            is_completed: data.progress.is_completed || false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };
  
  const updateProgress = async (isCompleted: boolean) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          is_completed: isCompleted,
          completion_percentage: isCompleted ? 100 : progress.completion_percentage,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update progress');
      }
      
      const data = await response.json();
      
      setProgress({
        completion_percentage: data.progress.completion_percentage,
        is_completed: data.progress.is_completed,
      });
      
      toast({
        title: 'Progress Updated',
        description: isCompleted 
          ? 'Lesson marked as completed!' 
          : 'Progress updated successfully',
        variant: 'default',
      });
      
      // If completing and there's a next lesson, navigate to it
      if (isCompleted && nextLessonId) {
        router.push(`/courses/${courseSlug}/learn/${nextLessonId}`);
      } else if (isCompleted && isLastLesson) {
        // If this is the last lesson, go back to course overview
        router.push(`/courses/${courseSlug}/learn`);
      }
      
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update progress',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determine which button to show based on completion status
  const renderActionButton = () => {
    if (isLoading) {
      return (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating...
        </Button>
      );
    }
    
    if (progress.is_completed) {
      return (
        <div className="space-y-3">
          <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="mr-2 h-5 w-5" />
            Lesson Completed
          </div>
          
          {nextLessonId ? (
            <Button 
              onClick={() => router.push(`/courses/${courseSlug}/learn/${nextLessonId}`)}
              className="w-full"
            >
              <Play className="mr-2 h-4 w-4" />
              Continue to Next Lesson
            </Button>
          ) : isLastLesson ? (
            <Button 
              onClick={() => router.push(`/courses/${courseSlug}/learn`)}
              className="w-full"
            >
              Return to Course Overview
            </Button>
          ) : null}
        </div>
      );
    }
    
    return (
      <Button 
        onClick={() => updateProgress(true)} 
        className="w-full"
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        Mark as Complete
      </Button>
    );
  };
  
  return (
    <div className="space-y-4">
      {renderActionButton()}
    </div>
  );
} 