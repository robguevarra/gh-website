# Course Editor Enhancement - Phase 3: Video Embedding

## Task Objective
Enhance the course editor with a dedicated video embedding functionality that allows course creators to easily add Vimeo videos to lessons without requiring complex rich text editor integration.

## Current State Assessment
- ✅ Course editor allows creating and organizing course content
- ✅ Student view in `/dashboard/course` displays videos for lessons
- ✅ Vimeo embedding is implemented through a TipTap extension
- ❌ Video embedding UX is not intuitive and can be buggy
- ❌ No dedicated field for adding videos to lessons
- ❌ Inconsistent experience between content creation and consumption

## Future State Goal
A streamlined course editor that:
- ✅ Provides a dedicated field for adding videos to lessons
- ✅ Accepts Vimeo embed codes directly
- ✅ Ensures videos are properly displayed in the student view
- ✅ Maintains progress tracking functionality
- ✅ Creates a consistent experience between editor and student view

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Previously completed build notes, especially course editor enhancements
> 2. Project context (`ProjectContext.md`)
> 3. Design context (`designContext.md`)
> 4. Progress tracking context (`progressTrackingContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Progress Tracking Context
From the `progressTrackingContext.md`, the following key points inform our approach:
- Student view expects a video for every lesson
- Progress tracking is primarily based on video watching
- Lessons are marked as complete when 95% of the video is watched
- The current implementation stores Vimeo embed codes/IDs in the lesson data

## Implementation Plan

### 1. Enhance Lesson Editor Interface

- [ ] Add a dedicated "Video" section to the lesson editor:
  - [ ] Create a new component `VideoEmbedField` in `components/admin/courses/new-course-editor/video-embed-field.tsx`
  - [ ] Add the component to the lesson editor interface
  - [ ] Style the component to match the existing design system

- [ ] Implement video input functionality:
  - [ ] Create input field for Vimeo URL or embed code
  - [ ] Add validation for Vimeo URLs and embed codes
  - [ ] Implement preview functionality to show the embedded video
  - [ ] Add clear button to remove the video

- [ ] Update lesson data structure:
  - [ ] Ensure the `metadata` field in the lessons table can store video information
  - [ ] Add a `videoUrl` or `videoEmbed` field to the lesson metadata
  - [ ] Update the lesson type definitions to include video information

### 2. Backend Integration

- [ ] Update lesson API endpoints:
  - [ ] Modify `updateLesson` function to handle video embed data
  - [ ] Ensure video data is properly stored in the database
  - [ ] Add validation for video URLs and embed codes

- [ ] Enhance data access layer:
  - [ ] Update data access functions to include video information
  - [ ] Ensure proper typing for video data
  - [ ] Add helper functions for extracting Vimeo IDs from URLs or embed codes

### 3. Student View Integration

- [ ] Update the student view to use the dedicated video field:
  - [ ] Modify `LessonPlayer` component to use the video from lesson metadata
  - [ ] Ensure proper fallback if no video is provided
  - [ ] Maintain progress tracking functionality

- [ ] Enhance video player component:
  - [ ] Ensure compatibility with Vimeo embeds
  - [ ] Maintain progress tracking functionality
  - [ ] Add proper error handling for invalid embed codes

### 4. Testing and Validation

- [ ] Create test cases for video embedding:
  - [ ] Test adding various Vimeo URLs and embed codes
  - [ ] Test progress tracking with embedded videos
  - [ ] Test the student view with embedded videos

- [ ] Validate the implementation:
  - [ ] Ensure videos are properly displayed in the student view
  - [ ] Verify progress tracking works correctly
  - [ ] Check for any performance issues

## Technical Considerations

### Data Structure
- Store video information in the lesson metadata:
  ```typescript
  interface LessonMetadata {
    videoType: 'vimeo' | 'youtube' | 'other';
    videoId?: string;
    videoUrl?: string;
    videoEmbed?: string;
    // Other metadata fields
  }
  ```

### Video Embedding
- Use Vimeo's oEmbed API for generating embed codes:
  ```typescript
  async function getVimeoEmbedCode(url: string): Promise<string> {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    return data.html;
  }
  ```

### Progress Tracking
- Ensure the video player component reports progress correctly:
  ```typescript
  function handleProgress(progress: number, currentTime: number) {
    updateLessonProgress(userId, lessonId, {
      status: progress >= 95 ? 'completed' : 'in-progress',
      progress: Math.round(progress),
      lastPosition: Math.floor(currentTime)
    });
  }
  ```

## Implementation Details

### VideoEmbedField Component
```tsx
interface VideoEmbedFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function VideoEmbedField({ value, onChange }: VideoEmbedFieldProps) {
  const [inputValue, setInputValue] = useState(value);
  const [videoId, setVideoId] = useState<string | null>(extractVimeoId(value));
  const [error, setError] = useState<string | null>(null);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Extract Vimeo ID
    const id = extractVimeoId(newValue);
    setVideoId(id);

    if (newValue && !id) {
      setError('Please enter a valid Vimeo URL or embed code');
    } else {
      setError(null);
      onChange(newValue);
    }
  };

  // Clear video
  const handleClear = () => {
    setInputValue('');
    setVideoId(null);
    setError(null);
    onChange('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="video-embed">Vimeo Video URL or Embed Code</Label>
        <Input
          id="video-embed"
          placeholder="https://vimeo.com/123456789 or paste embed code"
          value={inputValue}
          onChange={handleChange}
          className={error ? 'border-red-500' : ''}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {videoId && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="aspect-video rounded-md overflow-hidden border">
            <iframe
              src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash className="h-4 w-4 mr-2" />
            Remove Video
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Lesson Editor Integration
```tsx
// In the lesson editor component
const [videoUrl, setVideoUrl] = useState(lesson?.metadata?.videoUrl || '');

// Save function
const handleSave = async () => {
  await updateLesson(lessonId, {
    title,
    content,
    metadata: {
      ...lesson.metadata,
      videoUrl,
      videoType: 'vimeo',
      videoId: extractVimeoId(videoUrl)
    }
  });
};

// In the JSX
<Tabs defaultValue="content">
  <TabsList>
    <TabsTrigger value="content">Content</TabsTrigger>
    <TabsTrigger value="video">Video</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="content">
    <RichTextEditor value={content} onChange={setContent} />
  </TabsContent>

  <TabsContent value="video">
    <VideoEmbedField value={videoUrl} onChange={setVideoUrl} />
  </TabsContent>

  <TabsContent value="settings">
    {/* Lesson settings */}
  </TabsContent>
</Tabs>
```

## Completion Status

This phase is partially complete. Achievements so far:

1. ✅ Created a dedicated `VideoEmbedField` component for embedding Vimeo videos
2. ✅ Added a new `LessonSettingsPanel` component with tabs for general, video, and completion settings
3. ✅ Implemented proper metadata structure for storing video information
4. ✅ Added helper functions for accessing video data from lessons
5. ✅ Created type definitions for different lesson types (video, quiz, assignment)

Pending items:

1. ✅ Update the student view to use the dedicated video field
2. ✅ Implement proper video player controls in the student view
3. ✅ Update the student dashboard course viewer to display videos
4. ⬜ Add support for additional video providers (YouTube, etc.)
5. ⬜ Enhance progress tracking for different lesson types

## Next Steps After Completion

After implementing the video embedding functionality, we will:

1. Enhance the student view with better video player controls
2. Add support for additional video providers (YouTube, etc.)
3. Implement more advanced progress tracking features
4. Add analytics for video engagement

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
