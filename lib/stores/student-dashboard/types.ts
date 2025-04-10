/**
 * Types for the Student Dashboard Store
 * 
 * This file contains all the TypeScript interfaces and types used
 * in the student dashboard Zustand store.
 */

/**
 * User Profile Data
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

/**
 * Course enrollment types
 */
export interface UserEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  expiresAt?: string | null;
  status: string;
  paymentId?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: Course;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  imageUrl?: string;
  modules?: Module[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons?: Lesson[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  order: number;
  duration?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Progress tracking types
 */
export interface CourseProgress {
  courseId: string;
  course: Course;
  progress: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  startedAt?: string;
  lastAccessedAt?: string;
}

export interface ModuleProgress {
  moduleId: string;
  progress: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
}

export interface LessonProgress {
  lessonId: string;
  status: string; // 'not-started', 'in-progress', 'completed'
  progress: number; // 0-100
  lastPosition: number; // video position in seconds
  lastAccessedAt?: string;
  completedAt?: string;
}

export interface ContinueLearningLesson {
  lessonId: string;
  moduleId: string;
  courseId: string;
  lessonTitle: string;
  courseTitle: string;
  progress: number;
  lastPosition: number;
  lastAccessedAt?: string;
}

/**
 * Template types
 */
export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  fileUrl: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Purchase types
 */
export interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  itemType: string; // 'course', 'template', 'coaching'
  purchaseDate: string;
  amount: number;
  status: string;
  receiptUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Live class types
 */
export interface LiveClass {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  instructorName: string;
  zoomLink: string;
  recordingUrl?: string;
  status: string; // 'scheduled', 'live', 'completed', 'cancelled'
  createdAt: string;
  updatedAt: string;
}
