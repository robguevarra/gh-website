import type { Course, ExtendedModule, Lesson } from '../types';

/**
 * Helper function to ensure lesson has all required fields
 *
 * @param lesson - The lesson to normalize
 * @returns A normalized lesson with all required fields
 */
export function normalizeLesson(lesson: Lesson): Lesson {
  return {
    ...lesson,
    content: lesson.content || lesson.content_json?.content || '',
    content_json: lesson.content_json || {
      content: lesson.content || '',
      type: 'html',
      version: 1
    },
    metadata: lesson.metadata || {
      type: 'lesson'
    }
  };
}

/**
 * Helper function to transform modules
 *
 * @param modules - The modules to transform
 * @returns Transformed modules with normalized lessons
 */
export function transformModules(modules: ExtendedModule[]): ExtendedModule[] {
  return (modules || []).map((module: ExtendedModule) => ({
    ...module,
    lessons: (module.lessons || []).map(normalizeLesson)
  }));
}

/**
 * Helper function to transform course data
 *
 * @param course - The course to transform
 * @returns Transformed course with normalized modules and lessons
 */
export function transformCourse(course: Course): Course {
  return {
    ...course,
    modules: course.modules?.map(module => ({
      ...module,
      lessons: (module.lessons || []).map(normalizeLesson)
    }))
  };
}