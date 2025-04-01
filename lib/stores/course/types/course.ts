import { Lesson } from './lesson';
import { Module } from './module';

export interface Course {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  is_published?: boolean;
  content_json?: Record<string, unknown>;
  version?: number;
  published_version?: number;
  metadata?: Record<string, unknown>;
  updated_at?: string;
  modules?: Module[];
}

// Course-specific transformed types
export interface TransformedCourse extends Omit<Course, 'modules'> {
  modules: TransformedModule[];
}

export interface TransformedModule extends Module {
  items: TransformedLesson[];
}

export interface TransformedLesson {
  id: string;
  title: string;
  type: 'video' | 'lesson' | 'quiz' | 'assignment';
  duration: number;
  content: string;
  content_json?: {
    content: string;
    type: string;
    version: number;
  };
} 