// Student Dashboard Types

// Enrollment Types
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

// Progress Types
export interface CourseProgress {
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

export interface ModuleProgress {
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

export interface LessonProgress {
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

export interface UserTimeSpent {
  id: string;
  userId: string;
  lessonId: string;
  durationSeconds: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
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
  googleDriveId: string;
  description?: string;
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
    progress: CourseProgress;
  };
};

export type StudentDashboardAction = 
  | SetEnrollmentsAction
  | SetTemplatesAction
  | SetProgressAction;
