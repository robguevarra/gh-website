export interface Lesson {
  id: string;
  title: string;
  description?: string;
  position: number;
  status: 'draft' | 'published' | 'archived';
  content_json?: {
    content: string;
    type: string;
    version: number;
  };
  metadata?: {
    type: 'video' | 'lesson' | 'quiz' | 'assignment';
    [key: string]: unknown;
  };
  updated_at?: string;
} 