/**
 * Utility functions for calculating and managing course progress
 */

import { type ModuleProgress, type LessonProgress } from '@/lib/stores/student-dashboard/types';

/**
 * Calculate the overall course progress based on module progress data
 */
export const calculateCourseProgress = ({
  moduleProgressList,
  modulesCount,
}: {
  moduleProgressList: ModuleProgress[]; 
  modulesCount: number;
}): number => {
  if (!moduleProgressList.length || modulesCount === 0) return 0;
  
  // Sum up all module progress percentages
  const totalProgress = moduleProgressList.reduce(
    (acc, module) => acc + (module.progressPercentage || 0), 
    0
  );
  
  // Calculate the average
  return Math.round(totalProgress / modulesCount);
};

/**
 * Calculate module progress based on lesson progress data
 */
export const calculateModuleProgress = ({
  lessonProgressList,
  lessonsCount,
}: {
  lessonProgressList: LessonProgress[];
  lessonsCount: number;
}): number => {
  if (!lessonProgressList.length || lessonsCount === 0) return 0;
  
  // Sum up all lesson progress percentages
  const totalProgress = lessonProgressList.reduce(
    (acc, lesson) => acc + (lesson.progressPercentage || 0), 
    0
  );
  
  // Calculate the average
  return Math.round(totalProgress / lessonsCount);
};

/**
 * Determine if a course is completed based on module progress
 */
export const isCourseCompleted = ({
  moduleProgressList,
  modulesCount,
}: {
  moduleProgressList: ModuleProgress[];
  modulesCount: number;
}): boolean => {
  if (!moduleProgressList.length || modulesCount === 0) return false;
  
  // Count completed modules (those with 100% progress)
  const completedModules = moduleProgressList.filter(
    module => module.progressPercentage === 100
  ).length;
  
  // Course is completed if all modules are completed
  return completedModules === modulesCount;
};

/**
 * Determine if a module is completed based on lesson progress
 */
export const isModuleCompleted = ({
  lessonProgressList,
  lessonsCount,
}: {
  lessonProgressList: LessonProgress[];
  lessonsCount: number;
}): boolean => {
  if (!lessonProgressList.length || lessonsCount === 0) return false;
  
  // Count completed lessons (those with 100% progress)
  const completedLessons = lessonProgressList.filter(
    lesson => lesson.progressPercentage === 100
  ).length;
  
  // Module is completed if all lessons are completed
  return completedLessons === lessonsCount;
};

/**
 * Get the next lesson to continue in a course based on progress
 */
export const getNextLesson = ({
  lessonProgressList,
  orderedLessons,
}: {
  lessonProgressList: LessonProgress[];
  orderedLessons: { id: string; moduleId: string; order: number }[];
}): { lessonId: string; moduleId: string } | null => {
  if (!orderedLessons.length) return null;
  
  // Create a map of lesson progress for quick lookup
  const progressMap = new Map<string, LessonProgress>();
  lessonProgressList.forEach(progress => {
    progressMap.set(progress.lessonId, progress);
  });
  
  // Find the first incomplete lesson (less than 100% progress)
  const nextLesson = orderedLessons.find(lesson => {
    const progress = progressMap.get(lesson.id);
    return !progress || progress.progressPercentage < 100;
  });
  
  if (!nextLesson) {
    // If all lessons are completed, return the last one
    const lastLesson = orderedLessons[orderedLessons.length - 1];
    return { lessonId: lastLesson.id, moduleId: lastLesson.moduleId };
  }
  
  return { lessonId: nextLesson.id, moduleId: nextLesson.moduleId };
};

/**
 * Format a number as a percentage string (e.g., "75%")
 */
export const formatProgress = (progress: number): string => {
  return `${Math.round(progress)}%`;
};

/**
 * Calculate time remaining based on current progress and total duration
 */
export const calculateTimeRemaining = ({
  currentProgress,
  totalDurationMinutes,
}: {
  currentProgress: number;
  totalDurationMinutes: number;
}): number => {
  if (currentProgress >= 100) return 0;
  
  const progressRatio = currentProgress / 100;
  const remainingRatio = 1 - progressRatio;
  
  return Math.round(totalDurationMinutes * remainingRatio);
};

/**
 * Format time remaining in a human-readable format
 */
export const formatTimeRemaining = (timeRemainingMinutes: number): string => {
  if (timeRemainingMinutes <= 0) return 'Completed';
  
  const hours = Math.floor(timeRemainingMinutes / 60);
  const minutes = timeRemainingMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};
