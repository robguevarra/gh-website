/**
 * Student Dashboard Types
 * 
 * This file contains type definitions for the student dashboard.
 * We maintain a clear separation between database types (prefixed with 'DB')
 * and UI types (prefixed with 'UI') to ensure type safety and maintainability.
 */

// ==============================
// Database Types (from Supabase)
// ==============================

/**
 * Database User Enrollment
 */
export interface DBUserEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  expiresAt: string | null;
  status: 'active' | 'suspended' | 'cancelled';
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
    description: string;
    slug: string;
    coverImage: string;
  };
}

/**
 * UI User Enrollment (used in the dashboard)
 */
export interface UserEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  expiresAt: string | null;
  status: 'active' | 'suspended' | 'cancelled';
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
    description: string;
    slug: string;
    coverImage: string;
  };
}

// ==============================
// Database Progress Types
// ==============================

/**
 * Database Course Progress
 */
export interface DBCourseProgress {
  id: string;
  userId: string;
  courseId: string;
  progressPercentage: number;
  startedAt: string;
  completedAt: string | null;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database Module Progress
 */
export interface DBModuleProgress {
  id: string;
  userId: string;
  moduleId: string;
  progressPercentage: number;
  startedAt: string;
  completedAt: string | null;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
  module?: {
    id: string;
    title: string;
    order: number;
  };
}

/**
 * Database Lesson Progress
 */
export interface DBLessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  status: 'not_started' | 'started' | 'in_progress' | 'completed';
  progressPercentage: number;
  lastPosition: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lesson?: {
    id: string;
    title: string;
    moduleId: string;
    order: number;
    duration: number;
  };
}

// ==============================
// UI Progress Types (for Dashboard)
// ==============================

/**
 * UI Course Progress
 * Used for displaying course progress in the dashboard
 */
export interface UICourseProgress {
  courseId: string;
  course: {
    id: string;
    title: string;
    description: string;
    slug: string;
    modules?: any[];
  };
  progress: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
}

/**
 * UI Module Progress
 * Used for displaying module progress in the dashboard
 */
export interface UIModuleProgress {
  moduleId: string;
  progress: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
}

/**
 * UI Lesson Progress
 * Used for displaying lesson progress in the dashboard
 */
export interface UILessonProgress {
  status: string;
  progress: number;
  lastPosition: number;
  lastAccessedAt?: string;
}

/**
 * Database User Time Spent
 */
export interface DBUserTimeSpent {
  id: string;
  userId: string;
  lessonId: string;
  durationSeconds: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * UI User Time Spent
 */
export interface UserTimeSpent extends DBUserTimeSpent {}

/**
 * Continue Learning Lesson
 * Used for displaying the most recent lesson in the dashboard
 */
export interface ContinueLearningLesson {
  lessonId: string;
  moduleId: string;
  courseId: string;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  progress: number;
  lastPosition: number;
  status: string;
  lastAccessedAt?: string;
}

// Template Types
export interface Template {
  id: string;
  name: string;
  type: string;
  category: string;
  size: string;
  thumbnail: string;
  downloads: number;
  views?: number;
  googleDriveId: string;
  description?: string;
  courseId?: string;
  course?: UICourseProgress;
  createdAt?: string;
  updatedAt?: string;
}

// Purchase Types
export interface Purchase {
  id: string;
  date: string;
  items: PurchaseItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  receiptUrl?: string;
}

export interface PurchaseItem {
  name: string;
  price: number;
  image: string;
  quantity?: number;
  sku?: string;
}

// Live Class Types
export interface LiveClass {
  id: string;
  title: string;
  date: string;
  time: string;
  host: {
    name: string;
    avatar: string;
  };
  zoomLink: string;
  description?: string;
  recordingUrl?: string;
  isRecorded?: boolean;
}

// Announcement Types
export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isNew: boolean;
}

// Student Types
export interface Student {
  name: string;
  email: string;
  avatar: string;
  joinedDate: string;
}

// Action Types (for future implementation of actions)
export type SetEnrollmentsAction = {
  type: 'SET_ENROLLMENTS';
  payload: UserEnrollment[];
};

export type SetTemplatesAction = {
  type: 'SET_TEMPLATES';
  payload: Template[];
};

export type SetProgressAction = {
  type: 'SET_PROGRESS';
  payload: {
    courseId: string;
    progress: UICourseProgress;
  };
};

export type StudentDashboardAction = 
  | SetEnrollmentsAction
  | SetTemplatesAction
  | SetProgressAction;
