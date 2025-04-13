# Progress Tracking & Course Viewer Context

## Overview

This document provides context on the current implementation of progress tracking in our LMS platform and the relationship between the course editor and student course viewer. It serves as a reference for all developers working on the platform to ensure consistency and alignment with project goals.

## Current Implementation

### Database Structure

1. **User Progress Table**:
   ```sql
   CREATE TABLE public.user_progress (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
     status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed
     progress_percentage DECIMAL(5, 2) DEFAULT 0,
     last_position INT DEFAULT 0, -- video position in seconds
     completed_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE (user_id, lesson_id)
   );
   ```

2. **Progress Calculation**:
   - Module progress = (completed lessons / total lessons) * 100
   - Course progress = (sum of module progress) / number of modules
   - Time remaining is estimated based on lesson count and current progress

### Progress Tracking Logic

1. **Video Progress**:
   - The `VideoPlayer` component tracks video playback position
   - Progress updates are sent every 5 seconds during playback
   - A lesson is marked as "completed" when 95% of the video is watched
   - The player saves the last position to allow resuming

2. **Progress Storage**:
   - Progress is stored in the Supabase `user_progress` table
   - A Zustand store (`useStudentDashboardStore`) manages client-side state
   - The `updateLessonProgress` function updates both local state and database

### Key Components

1. **Student Dashboard Store**:
   - Located at `lib/stores/student-dashboard/index.ts`
   - Manages enrollment, progress, and course data
   - Provides actions for updating lesson progress

2. **Video Player Component**:
   - Located at `components/dashboard/lesson-player.tsx`
   - Tracks video playback and reports progress
   - Handles lesson completion logic

3. **Progress Utilities**:
   - Located at `lib/utils/progress-utils.ts`
   - Contains functions for calculating progress percentages
   - Provides time remaining calculations

## Course Editor vs. Student View

### Current Relationship

1. **Content Creation Flow**:
   - Course creators use the course editor to create and organize content
   - Content is stored in the database with a hierarchical structure (course > modules > lessons)
   - Students access this content through the dashboard course viewer

2. **Video Content**:
   - The student view in `/dashboard/course` displays videos for lessons
   - The course editor supports Vimeo embeds through a custom TipTap extension
   - Videos are rendered in the student view using the stored embed code

### Identified Discrepancies

1. **Video Implementation**:
   - Student view expects a video for every lesson
   - Course editor's video embedding is functional but not prominently featured
   - Vimeo embeds work but the UX for adding them could be improved

2. **Progress Configuration**:
   - No way for course creators to define completion criteria
   - Completion threshold is hardcoded at 95% for videos
   - No specialized settings for different content types

3. **Content Types**:
   - Student view has placeholders for different content types (quizzes, assignments)
   - Editor doesn't have specialized interfaces for creating these content types

## Implementation Focus

For our custom LMS implementation for the specific client, we're focusing on:

1. **Video Integration**:
   - Ensuring every lesson can have an associated video
   - Supporting Vimeo embeds (current implementation)
   - Improving the UX for adding videos to lessons

2. **Simplified Approach**:
   - Rather than implementing a complex editor with embedded video capabilities
   - Add a dedicated video field/section to each lesson
   - Accept embed codes directly without requiring complex editor integration

This approach aligns with the client's needs while ensuring a consistent experience between content creation and consumption.

## Technical Implementation Notes

1. **Video Storage**:
   - Videos are not stored directly in our system
   - We store Vimeo embed codes/IDs in the lesson data
   - The `content_json` field in the lessons table contains the lesson content

2. **Progress Tracking**:
   - Progress is tracked at the lesson level
   - Video progress is the primary metric for lesson completion
   - The system automatically marks lessons as complete at 95% progress

3. **Security Considerations**:
   - Vimeo's embed privacy settings should be respected
   - For protected videos, use the proper embed code from Vimeo
   - Ensure proper authentication for accessing course content

## Next Steps

The immediate focus is on improving the video embedding experience in the course editor by:

1. Adding a dedicated video field to the lesson editor interface
2. Ensuring proper storage and retrieval of video embed codes
3. Maintaining the current progress tracking functionality
4. Ensuring a seamless experience between content creation and consumption

This approach provides the essential functionality needed for the client while setting a foundation for potential future enhancements.
