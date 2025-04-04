import { Lesson } from './lesson';
import { Module } from './module';

/**
 * Course type representing a complete course with modules and lessons
 *
 * @property {string} id - Unique identifier for the course
 * @property {string} title - Course title
 * @property {string} [description] - Optional course description
 * @property {'draft' | 'published' | 'archived'} status - Current course status
 * @property {boolean} [is_published] - Whether the course is published
 * @property {Record<string, unknown>} [content_json] - Structured course content
 * @property {number} [version] - Course version number
 * @property {number} [published_version] - Latest published version number
 * @property {Record<string, unknown>} [metadata] - Additional course metadata
 * @property {string} [updated_at] - Last update timestamp
 * @property {Module[]} [modules] - Array of modules in this course
 */
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

/**
 * @deprecated Use Module and Lesson types directly
 * These interfaces are kept for backward compatibility but should not be used in new code
 */
export interface TransformedCourse extends Omit<Course, 'modules'> {
  modules: TransformedModule[];
}

/**
 * @deprecated Use Module type with lessons property
 *
 * Note: The items property has been removed in favor of using lessons directly
 */
export interface TransformedModule extends Module {
  // No items property - use lessons instead
}

/**
 * @deprecated Use Lesson type directly
 */
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