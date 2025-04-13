import { LessonMetadata, VideoLessonMetadata, QuizLessonMetadata, AssignmentLessonMetadata } from './lesson-metadata';

/**
 * Unified Lesson type used throughout the application
 *
 * @property {string} id - Unique identifier for the lesson
 * @property {string} title - Lesson title
 * @property {string} [description] - Optional lesson description
 * @property {number} position - Lesson position within its module
 * @property {'draft' | 'published' | 'archived'} status - Current lesson status
 * @property {string} [content] - Legacy content field (HTML string)
 * @property {Object} [content_json] - Structured content object
 * @property {string} content_json.content - The actual content (HTML string)
 * @property {string} content_json.type - Content type (usually 'html')
 * @property {number} content_json.version - Content version number
 * @property {string} module_id - ID of the parent module
 * @property {number} [duration] - Lesson duration in seconds/minutes
 * @property {boolean} [is_preview] - Whether this lesson is available in preview mode
 * @property {LessonMetadata} [metadata] - Additional lesson metadata
 * @property {string} [created_at] - Creation timestamp
 * @property {string} [updated_at] - Last update timestamp
 */
export interface Lesson {
  id: string;
  title: string;
  description?: string;
  position: number;
  status: 'draft' | 'published' | 'archived';
  content?: string;
  content_json?: {
    content: string;
    type: string;
    version: number;
  };
  module_id: string;
  duration?: number;
  is_preview?: boolean;
  metadata?: LessonMetadata | VideoLessonMetadata | QuizLessonMetadata | AssignmentLessonMetadata;
  created_at?: string;
  updated_at?: string;
}

/**
 * Helper function to get the video URL from a lesson
 * @param lesson The lesson object
 * @returns The video URL or null if not found
 */
export function getLessonVideoUrl(lesson: Lesson | null | undefined): string | null {
  if (!lesson || !lesson.metadata) return null;

  const metadata = lesson.metadata as VideoLessonMetadata;
  return metadata.videoUrl || null;
}

/**
 * Helper function to get the video ID from a lesson
 * @param lesson The lesson object
 * @returns The video ID or null if not found
 */
export function getLessonVideoId(lesson: Lesson | null | undefined): string | null {
  if (!lesson || !lesson.metadata) return null;

  const metadata = lesson.metadata as VideoLessonMetadata;
  return metadata.videoId || null;
}