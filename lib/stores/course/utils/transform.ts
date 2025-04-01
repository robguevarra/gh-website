import type { Course, ExtendedModule, Lesson, ModuleItem, TransformedLesson, TransformedModule } from '../types';

// Helper function to transform a ModuleItem to a TransformedLesson
export function transformModuleItem(item: ModuleItem): TransformedLesson {
  return {
    id: item.id,
    title: item.title,
    type: item.type || 'lesson',
    duration: item.duration || 0,
    content: item.content || '',
    content_json: item.content_json
  };
}

// Helper function to ensure module has items
export function ensureModuleItems(module: ExtendedModule): TransformedModule {
  return {
    ...module,
    items: (module.items || []).map(transformModuleItem)
  };
}

// Helper function to transform modules
export function transformModules(modules: ExtendedModule[]): ExtendedModule[] {
  return (modules || []).map((module: ExtendedModule) => ({
    ...module,
    items: (module.lessons || []).map((lesson: Lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: (lesson.metadata?.type as ModuleItem['type']) || 'lesson',
      duration: 0,
      content: lesson.content_json?.content || '',
      content_json: lesson.content_json
    }))
  }));
}

// Helper function to transform course data
export function transformCourse(course: Course): Course {
  return {
    ...course,
    modules: course.modules?.map(module => ({
      ...module,
      items: module.lessons?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.metadata?.type || 'lesson',
        content: lesson.content_json?.content || '',
        content_json: lesson.content_json,
        duration: 0
      }))
    }))
  };
} 