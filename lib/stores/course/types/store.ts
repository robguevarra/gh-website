import { Course, TransformedModule } from './course';
import { ExtendedModule } from './module';
import { Lesson } from './lesson';

export interface ModuleItem {
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
  addContent: (courseId: string, moduleId: string, type: string) => Promise<void>;
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