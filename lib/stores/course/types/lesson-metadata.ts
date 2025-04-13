/**
 * Lesson metadata types
 * 
 * This file contains the TypeScript interfaces for lesson metadata
 * used in the course editor and student dashboard.
 */

/**
 * Base lesson metadata interface
 */
export interface LessonMetadata {
  /**
   * The type of lesson content
   */
  type?: 'video' | 'text' | 'quiz' | 'assignment';
  
  /**
   * Lesson duration in minutes
   */
  duration?: number;
  
  /**
   * Whether the lesson is downloadable
   */
  downloadable?: boolean;
  
  /**
   * Whether completion is required to progress
   */
  requireCompletion?: boolean;
  
  /**
   * Percentage threshold for marking video as complete (50-100)
   */
  completionThreshold?: number;
  
  /**
   * Additional metadata fields
   */
  [key: string]: unknown;
}

/**
 * Video-specific metadata
 */
export interface VideoLessonMetadata extends LessonMetadata {
  /**
   * The type of lesson content (always 'video' for this interface)
   */
  type: 'video';
  
  /**
   * The video provider (currently only 'vimeo' is supported)
   */
  videoType?: 'vimeo' | 'youtube' | 'other';
  
  /**
   * The video URL or embed code
   */
  videoUrl?: string;
  
  /**
   * The extracted video ID
   */
  videoId?: string;
}

/**
 * Quiz-specific metadata
 */
export interface QuizLessonMetadata extends LessonMetadata {
  /**
   * The type of lesson content (always 'quiz' for this interface)
   */
  type: 'quiz';
  
  /**
   * Passing score percentage (0-100)
   */
  passingScore?: number;
  
  /**
   * Maximum attempts allowed (0 for unlimited)
   */
  maxAttempts?: number;
}

/**
 * Assignment-specific metadata
 */
export interface AssignmentLessonMetadata extends LessonMetadata {
  /**
   * The type of lesson content (always 'assignment' for this interface)
   */
  type: 'assignment';
  
  /**
   * Whether submission is required
   */
  requireSubmission?: boolean;
  
  /**
   * Deadline in days from enrollment
   */
  deadlineDays?: number;
}

/**
 * Type guard to check if metadata is for a video lesson
 */
export function isVideoLessonMetadata(metadata: LessonMetadata | undefined): metadata is VideoLessonMetadata {
  return metadata?.type === 'video';
}

/**
 * Type guard to check if metadata is for a quiz lesson
 */
export function isQuizLessonMetadata(metadata: LessonMetadata | undefined): metadata is QuizLessonMetadata {
  return metadata?.type === 'quiz';
}

/**
 * Type guard to check if metadata is for an assignment lesson
 */
export function isAssignmentLessonMetadata(metadata: LessonMetadata | undefined): metadata is AssignmentLessonMetadata {
  return metadata?.type === 'assignment';
}
