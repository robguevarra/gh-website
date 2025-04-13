# Course Editor Context

## Overview

This document provides a comprehensive overview of the course editor implementation, state management patterns, and the relationship between the editor and student views. It serves as a reference for developers working on improvements to the student dashboard and course viewing experience.

## Architecture

The course editor is built using a combination of:

1. **Zustand Store** - For persistent application state
2. **React Context** - For ephemeral UI state and content sharing
3. **Component State** - For local UI state

This architecture allows for efficient state management while maintaining a clear separation of concerns.

## State Management

### Zustand Store (`useCourseStore`)

The Zustand store is the source of truth for persistent data:

- Course structure (modules, lessons)
- Selection state (selected module, selected lesson)
- Loading and error states
- Expanded modules tracking

```typescript
// Key store structure
interface CourseStore {
  course: Course | null;
  modules: ExtendedModule[];
  selectedModuleId: string | null;
  selectedLessonId: string | null;
  expandedModules: Set<string>;
  isLoading: boolean;
  error: string | null;
  savedState: 'saved' | 'saving' | 'unsaved';
  
  // Actions
  fetchCourse: (courseId: string, signal?: AbortSignal) => Promise<void>;
  updateCourse: (courseId: string, data: Partial<Course>) => Promise<void>;
  updateModule: (moduleId: string, data: Partial<ExtendedModule>) => Promise<void>;
  updateLesson: (lessonId: string, data: Partial<Lesson>) => Promise<void>;
  selectModule: (moduleId: string | null) => void;
  selectLesson: (lessonId: string | null) => void;
  // ...other actions
}
```

The store is persisted to `sessionStorage` to maintain state across page refreshes:

```typescript
const persistOptions: PersistOptions<CourseStore, StorePersist> = {
  name: 'course-store',
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state): StorePersist => ({
    course: state.course,
    modules: state.modules,
    expandedModules: Array.from(state.expandedModules),
    selectedModuleId: state.selectedModuleId,
    selectedLessonId: state.selectedLessonId,
  }),
};
```

### React Context (`CourseContext`)

The React context is used for ephemeral state that needs to be shared across components:

```typescript
type CourseContextType = {
  modules: EditorModule[]
  setModules: React.Dispatch<React.SetStateAction<EditorModule[]>>
  activeModuleId: string | null
  setActiveModuleId: (id: string | null) => void
  activeItemId: string | null
  setActiveItemId: (id: string | null) => void
  savedState: string
  setSavedState: (state: string) => void
  courseId: string
  currentContent: string | null
  setCurrentContent: (content: string) => void
}
```

The `currentContent` field in the context is particularly important as it holds the most up-to-date content being edited, which might not yet be persisted to the database.

## Content Editing Flow

### Content Loading

1. When a lesson is selected, the content is loaded from the database via the Zustand store
2. The content is set in the context via `setCurrentContent`
3. The rich text editor is initialized with this content

```typescript
useEffect(() => {
  if (!activeLesson) return;
  
  // Get content with fallbacks
  const content = activeLesson.content_json?.content || activeLesson.content || "<p>New lesson content goes here</p>";
  
  // Only update if content has changed
  if (content !== contextContent) {
    setCurrentContent(content);
  }
}, [activeLesson, contextContent, selectedLessonId, setCurrentContent]);
```

### Content Saving

Content saving follows the optimistic UI pattern:

1. Content changes in the editor update the context immediately
2. A debounced save operation is triggered to persist to the database
3. UI state is updated based on the result of the save operation

```typescript
// Debounced save function
const debouncedSave = useCallback(
  debounce(async (html: string) => {
    if (!selectedLessonId || !course) return;
    
    setCurrentContent(html);
    setSavedState("saving");
    
    try {
      await updateLesson(selectedLessonId, {
        content_json: {
          type: 'lesson',
          content: html,
          version: Date.now()
        }
      });
      setSavedState("saved");
    } catch (error) {
      console.error('Failed to save content:', error);
      setSavedState("unsaved");
    }
  }, 1000),
  [selectedLessonId, course, setCurrentContent, setSavedState, updateLesson]
);
```

### Editor-Student View Switching

When switching between editor and student views:

1. The editor content is immediately synced to the context
2. The view mode is switched without waiting for the save operation
3. The save operation continues in the background
4. The student view uses the content from context for the active lesson

```typescript
const toggleViewMode = () => {
  // If we're in editor mode, trigger a save operation
  if (viewMode === "editor") {
    // Dispatch event to ensure the editor's content is synced to context
    window.dispatchEvent(new Event("editor-save"));
    
    // Start a background save operation - don't wait for it
    Promise.resolve().then(async () => {
      try {
        setSavedState("saving");
        await handleSave();
        setSavedState("saved");
      } catch (error) {
        console.error("Error saving content in background:", error);
        setSavedState("unsaved");
      }
    });
  }

  // Immediately switch view mode - don't wait for save to complete
  setViewMode(viewMode === "editor" ? "student" : "editor");
};
```

## Lesson Types and Metadata

### Lesson Types

The system supports multiple lesson types:

```typescript
type LessonType = 'video' | 'text' | 'quiz' | 'assignment';
```

Each lesson type has specific metadata associated with it:

```typescript
interface LessonMetadata {
  type?: LessonType;
  duration?: number;
  downloadable?: boolean;
  requireCompletion?: boolean;
  completionThreshold?: number;
  [key: string]: unknown;
}

interface VideoLessonMetadata extends LessonMetadata {
  type: 'video';
  videoType?: 'vimeo' | 'youtube' | 'other';
  videoUrl?: string;
  videoId?: string;
}

interface QuizLessonMetadata extends LessonMetadata {
  type: 'quiz';
  passingScore?: number;
  maxAttempts?: number;
}

interface AssignmentLessonMetadata extends LessonMetadata {
  type: 'assignment';
  requireSubmission?: boolean;
  deadlineDays?: number;
}
```

### Video Embedding

Videos are embedded using the following approach:

1. Videos are stored as metadata in the lesson object
2. The video URL or embed code is stored in the `videoUrl` field
3. The extracted video ID is stored in the `videoId` field
4. The video type (currently only 'vimeo' is supported) is stored in the `videoType` field

Helper functions are provided to extract video information:

```typescript
export function getLessonVideoUrl(lesson: Lesson | null | undefined): string | null {
  if (!lesson || !lesson.metadata) return null;
  
  const metadata = lesson.metadata as VideoLessonMetadata;
  return metadata.videoUrl || null;
}

export function getLessonVideoId(lesson: Lesson | null | undefined): string | null {
  if (!lesson || !lesson.metadata) return null;
  
  const metadata = lesson.metadata as VideoLessonMetadata;
  return metadata.videoId || null;
}
```

## Student View Implementation

### Content Rendering

The student view renders content using the following approach:

1. Course modules and lessons are transformed into a format suitable for the student view
2. For the active lesson, content is taken from the context if available
3. For other lessons, content is taken from the database

```typescript
const studentModules = useMemo(() => {
  if (!course?.modules) return [];

  return course.modules.map(module => ({
    id: module.id,
    title: module.title,
    items: module.lessons?.map(lesson => {
      // Get video metadata if available
      const videoId = getLessonVideoId(lesson);
      const videoUrl = getLessonVideoUrl(lesson);
      
      // Check if this is the currently active lesson
      const isActiveLesson = lesson.id === activeItemId || lesson.id === selectedLessonId;
      
      // If this is the active lesson and we have current content in the context,
      // use that instead of the database content to ensure we see the latest edits
      const lessonContent = isActiveLesson && currentContent
        ? currentContent
        : lesson.content_json?.content as string || lesson.content || "";
      
      return {
        id: lesson.id,
        title: lesson.title,
        type: lesson.metadata?.type as string || "lesson",
        content: lessonContent,
        videoId,
        videoUrl
      };
    }) || []
  }));
}, [course, activeItemId, selectedLessonId, currentContent]);
```

### Video Rendering

Videos are rendered using an iframe with the appropriate embed URL:

```tsx
{activeItem.videoId && (
  <div className="mb-6">
    <div className="aspect-video rounded-md overflow-hidden border bg-black">
      <iframe
        src={`https://player.vimeo.com/video/${activeItem.videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title={`Video: ${activeItem.title}`}
      ></iframe>
    </div>
  </div>
)}
```

## Progress Tracking

Progress tracking is implemented in the student dashboard but not in the course editor preview. The progress tracking system:

1. Tracks individual lesson progress with fields:
   - `user_id`: References the user
   - `lesson_id`: References the lesson
   - `status`: 'not_started', 'in_progress', 'completed'
   - `progress_percentage`: Numerical progress (0-100)
   - `last_position`: Video position in seconds
   - `completed_at`: Timestamp when completed

2. Calculates course-level progress based on completed lessons
3. Displays progress as a percentage in the dashboard
4. Calculates time remaining based on lesson count and progress

## Recommendations for Student Dashboard Improvements

When implementing or improving the student dashboard view, consider the following:

### 1. State Management

- Use a similar state management pattern with Zustand for persistent state
- Implement optimistic UI updates for progress tracking
- Consider using React Query for data fetching and caching

### 2. Content Rendering

- Implement proper sanitization for HTML content
- Support all lesson types (video, text, quiz, assignment)
- Ensure responsive design for different screen sizes

### 3. Video Integration

- Support multiple video providers (Vimeo, YouTube, etc.)
- Implement proper video player controls
- Track video progress and automatically mark lessons as complete

### 4. Progress Tracking

- Implement real-time progress updates
- Store progress in the database
- Calculate and display course-level progress

### 5. User Experience

- Implement a clean, distraction-free learning environment
- Add keyboard shortcuts for navigation
- Provide clear feedback on progress and completion

### 6. Performance

- Implement lazy loading for course content
- Use virtualization for long lists of modules and lessons
- Optimize database queries for progress tracking

## Database Schema

### Lessons Table

```sql
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  content TEXT,
  content_json JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### User Progress Table

```sql
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  last_position INT DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);
```

## API Endpoints

### Course Data

- `GET /api/courses/:courseId` - Get course details
- `GET /api/courses/:courseId/modules` - Get course modules
- `GET /api/courses/:courseId/modules/:moduleId/lessons` - Get module lessons

### Progress Tracking

- `GET /api/user/progress/:courseId` - Get user progress for a course
- `POST /api/user/progress/:lessonId` - Update user progress for a lesson
- `GET /api/user/progress/:lessonId/status` - Get user progress status for a lesson

## Conclusion

This context document provides a comprehensive overview of the course editor implementation and the relationship between the editor and student views. It serves as a reference for developers working on improvements to the student dashboard and course viewing experience.

When implementing or improving the student dashboard, follow the patterns and practices outlined in this document to ensure a consistent and high-quality user experience.
