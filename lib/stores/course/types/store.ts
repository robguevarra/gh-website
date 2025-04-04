import { Course } from './course';
import { ExtendedModule } from './module';
import { Lesson } from './lesson';

/**
 * @deprecated Use Lesson type instead
 * This interface is kept for backward compatibility but should not be used in new code
 *
 * Note: This interface has been fully replaced by the Lesson type and should not be used in new code.
 * The type property is now part of the metadata object in the Lesson type.
 */
export interface ModuleItem extends Omit<Lesson, 'metadata'> {
  type: 'video' | 'lesson' | 'quiz' | 'assignment';
}

export interface CourseStore {
  course: Course | null;
  modules: ExtendedModule[];
  modulesCount: number;
  selectedModuleId: string | null;
  selectedLessonId: string | null;
  expandedModules: Set<string>;
  isLoading: boolean;
  error: string | null;
  pendingSave: boolean;
  savedState: 'saved' | 'saving' | 'unsaved';
  lastSaveTime: string | null;
  pendingOperations: Map<string, Promise<any>>;
  requestCache: Map<string, { data: any; timestamp: number }>;

  // Actions
  fetchCourse: (courseId: string, signal?: AbortSignal) => Promise<void>;
  updateCourse: (courseId: string, data: Partial<Course>) => Promise<void>;
  updateModule: (moduleId: string, data: Partial<ExtendedModule>) => Promise<void>;
  updateLesson: (lessonId: string, data: Partial<Lesson>) => Promise<void>;
  reorderModule: (moduleId: string, newPosition: number) => Promise<void>;
  reorderLesson: (lessonId: string, newPosition: number) => Promise<void>;
  selectModule: (moduleId: string | null) => void;
  selectLesson: (lessonId: string | null) => void;
  fetchModuleTree: (courseId: string, moduleId: string) => Promise<void>;
  addContent: (courseId: string, moduleId: string, type: string) => Promise<{
    id: string;
    title: string;
    content_json?: {
      content: string;
      type: string;
      version: number;
    };
  }>;
  toggleExpandedModule: (moduleId: string) => void;
  setModules: (modules: ExtendedModule[]) => void;
  setSavedState: (state: 'saved' | 'unsaved' | 'saving') => void;
  clearCache: () => void;
}

export interface RequestCache {
  data: any;
  timestamp: number;
  expiresAt: number;
}