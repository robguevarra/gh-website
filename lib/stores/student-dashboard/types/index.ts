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
    modules?: Array<{
      id: string;
      title: string;
      lessons?: Array<{
        id: string;
        title: string;
        module_id: string;
      }>;
    }>;
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

// ==============================
// Dashboard Purchase Types
// ==============================
// Use the same base type as in purchaseHistory.ts to ensure compatibility
import { PurchaseItem as BasePurchaseItem } from '@/lib/services/purchaseHistory';

// Extended PurchaseItem with UI-specific properties
export interface PurchaseItem extends BasePurchaseItem {
  // UI-specific properties
  name?: string; // Mapped from title
  price?: number; // Mapped from price_at_purchase
  image?: string; // Mapped from image_url
  googleDriveId?: string | null; // Mapped from google_drive_file_id
}

// Use the same base type as in purchaseHistory.ts to ensure compatibility
import { Purchase as BasePurchase } from '@/lib/services/purchaseHistory';

// Extended Purchase with UI-specific properties
export interface Purchase extends BasePurchase {
  // UI-specific properties
  date?: string; // Formatted from created_at
  status?: string; // Mapped from order_status
  total?: number; // Computed from total_amount
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
  content: string | null;
  type: 'general_update' | 'live_class' | 'sale_promo' | 'new_content';
  publish_date: string | null;
  expiry_date: string | null;
  link_url: string | null;
  link_text: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  sort_order: number | null;
  host_name: string | null;
  host_avatar_url: string | null;
  location: string | null;
  discount_percentage: number | null;
  target_audience: string | null;
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
