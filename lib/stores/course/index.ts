import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';
import type { CourseStore } from './types/store';
import { createCourseActions } from './actions/course';
import { createModuleActions } from './actions/module';
import { createLessonActions } from './actions/lesson';
import type { StoreApi } from 'zustand';

type SetState = StoreApi<CourseStore>['setState'];
type GetState = StoreApi<CourseStore>['getState'];

// Type-safe initial state
const createInitialState = (): Omit<CourseStore, keyof ReturnType<typeof createActions>> => ({
  course: null,
  modules: [],
  modulesCount: 0,
  selectedModuleId: null,
  selectedLessonId: null,
  isLoading: false,
  error: null,
  pendingSave: false,
  lastSaveTime: null,
  expandedModules: new Set<string>(),
  savedState: 'saved',
  requestCache: new Map(),
  pendingOperations: new Map(),
});

// Separate actions creation for better organization
const createActions = (set: SetState, get: GetState) => ({
  clearCache: () => set({ requestCache: new Map(), pendingOperations: new Map() }),
  setModules: (modules: CourseStore['modules']) => set({ modules }),
  setSavedState: (savedState: CourseStore['savedState']) => set({ savedState }),
  selectModule: (moduleId: string | null) => set({ selectedModuleId: moduleId }),
  selectLesson: (lessonId: string | null) => set({ selectedLessonId: lessonId }),
  ...createCourseActions(set, get),
  ...createModuleActions(set, get),
  ...createLessonActions(set, get),
});

// Define persist options type
type StorePersist = {
  course: CourseStore['course'];
  modules: CourseStore['modules'];
  selectedModuleId: CourseStore['selectedModuleId'];
  selectedLessonId: CourseStore['selectedLessonId'];
  expandedModules: string[];
};

const persistOptions: PersistOptions<CourseStore, StorePersist> = {
  name: 'admin-course-editor-store', // Changed from 'course-store' for better isolation
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state): StorePersist => ({
    course: state.course,
    modules: state.modules,
    expandedModules: Array.from(state.expandedModules),
    selectedModuleId: state.selectedModuleId,
    selectedLessonId: state.selectedLessonId,
  }),
  onRehydrateStorage: (state) => {
    // Log initial state
    console.log('🔄 [Store] Initial state:', state ? {
      course: state.course?.id,
      modulesCount: state.modules?.length || 0,
      selectedModule: state.selectedModuleId,
      selectedLesson: state.selectedLessonId
    } : 'empty');

    return (hydratedState) => {
      if (!hydratedState) {
        console.log('ℹ️ [Store] Starting with fresh state');
        return;
      }

      const store = useCourseStore.getState();

      // Log hydrated state
      console.log('✅ [Store] Hydrated with:', {
        course: hydratedState.course?.id,
        modulesCount: hydratedState.modules.length,
        selectedModule: hydratedState.selectedModuleId,
        selectedLesson: hydratedState.selectedLessonId
      });

      // If we have a course, update the expandedModules set
      if (hydratedState.course?.id) {
        console.log('🔄 [Store] Restoring expanded modules state');
        store.expandedModules = new Set(hydratedState.expandedModules || []);
      }
    };
  },
};

// Create the persisted store
export const useCourseStore = create<CourseStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      ...createActions(set, get)
    }),
    persistOptions
  )
);