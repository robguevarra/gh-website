# Platform Integration - Phase 2-2: Student Experience System

## Task Objective
Develop a premium, exclusive student experience system that seamlessly manages access to our Papers to Profits course, Templates Library, and Shopify purchases. The system will create an informative, comprehensive dashboard for students who are new to the paper products business, guiding them through their learning journey and providing easy access to all resources.

## Current State Assessment
Our current enrollment implementation includes:

### Database Schema
- ✅ `user_enrollments` table with fields:
  ```sql
  CREATE TABLE public.user_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    course_id UUID NOT NULL REFERENCES public.courses(id),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active', -- active, suspended, cancelled
    payment_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, course_id)
  );
  ```
- ✅ RLS policies for secure access control:
  ```sql
  -- User can view their own enrollments
  CREATE POLICY user_enrollments_view_own ON public.user_enrollments
    FOR SELECT USING (auth.uid() = user_id);

  -- Admin can view all enrollments
  CREATE POLICY user_enrollments_admin_view ON public.user_enrollments
    FOR SELECT USING (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    );

  -- Admin can modify enrollments
  CREATE POLICY user_enrollments_admin_modify ON public.user_enrollments
    FOR ALL USING (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    );
  ```

### API Implementation
- ✅ Admin API routes:
  - `GET /api/admin/courses/[courseId]/enrollments` - List enrollments with filtering & pagination
  - `POST /api/admin/courses/[courseId]/enrollments` - Create enrollments
  - `GET/PATCH/DELETE /api/admin/courses/[courseId]/enrollments/[enrollmentId]` - Manage specific enrollments

### Data Access Layer
- ✅ Basic server-side data access functions in `lib/supabase/data-access.ts`:
  - `getUserEnrollments(userId)` - Get all active enrollments for a user
  - `enrollUserInCourse(userId, courseId, paymentId)` - Enroll a user in a course

### Client-Side Hooks
- ✅ Basic client-side hook in `lib/supabase/hooks.ts`:
  - `useUserEnrollments(userId)` - Hook for fetching user enrollments
  - Needs enhancement with SWR pattern and additional functionality

### Admin UI
- ✅ `CourseEnrollmentManagement` component in `/components/admin/course-enrollment-management.tsx`:
  - Displays enrollments in a table with status badges
  - Provides filtering by status
  - Offers pagination controls
  - Includes user search for adding enrollments
  - Supports status updates and deletion

### Access Control
- ✅ Basic access control checks in course pages:
  - Course detail pages check for active enrollments
  - Lesson pages verify user access before displaying content
  - No centralized middleware for enrollment validation yet

### Progress Tracking
- ✅ Basic `user_progress` table exists, but with a different schema than planned:
  ```sql
  -- Current schema (different from ideal)
  CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id),
    status TEXT NOT NULL DEFAULT 'not_started',
    progress_percentage NUMERIC DEFAULT 0,
    last_position INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
- ✅ Basic progress tracking functions:
  - `getUserLessonProgress(userId, lessonId)` - Get progress for a specific lesson
  - `updateUserProgress(userId, lessonId, progress)` - Update lesson progress
  - `useUserLessonProgress(userId, lessonId)` - Client-side hook for lesson progress

### Missing Components
- ❌ Post-payment integration with automatic account creation and welcome email
- ❌ Enhanced `useEnrollment` hook with SWR pattern and additional functionality
- ❌ Course-level progress tracking (vs. current lesson-level only)
- ✅ Student dashboard for enrolled courses (implemented in `app/dashboard2/page.tsx`)
- ❌ Enrollment-specific access control middleware for protected course content
- ❌ Enrollment lifecycle support (including unlimited/lifetime access option)
- ❌ Recommended database indexes for optimization
- ❌ Integration between payment completion and enrollment creation
- ❌ Comprehensive reporting and analytics
- ❌ Zustand store for enrollment state management

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Previously completed build notes, especially course editor enhancements
> 2. Project context (`ProjectContext.md`)
> 3. Design context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Project Context
From the `ProjectContext.md`, the following key points inform our enrollment approach:
- **Course Structure**: Hierarchical organization with courses, modules, and lessons
- **Authentication**: Fully implemented with Supabase Auth
- **Technical Foundation**: Next.js 15 with TypeScript, TailwindCSS, and Shadcn UI
- **State Management**: React hooks for local state, Zustand for more complex client-side state

### From Design Context
From the `designContext.md`, these design principles apply:
- **Typography**: Clear hierarchical structure with Inter for body text and Playfair Display for headings
- **Component Patterns**: Consistent styling for cards, buttons, forms, and navigation
- **Animation Principles**: Subtle animations that enhance rather than distract from content

### From Previously Completed Phases
The course editor implementation (from `course-editor-enhancement_phase-2_kajabi-like-features.md`) provides:
- **Content Structure**: Three-tier hierarchy with courses, modules, and lessons
- **State Management**: Zustand store patterns for managing course data
- **UI Patterns**: Card-based interfaces with proper loading and error states

### Existing Implementations
Our current codebase already includes relevant functionality we can leverage:
- **Course Preview**: The admin courses page (`app/admin/courses/page.tsx`) already includes a preview function with a "Preview" button linking to `/courses/${course.slug}`
- **Card-Based UI**: Course cards with badges for status, clean typography, and consistent spacing
- **State Management**: Uses `useCourseStore` from Zustand for global course state

## Current Context
When students enroll in our Papers to Profits program:
1. They receive a Google Drive link for their templates library
2. They gain access to the Papers to Profits course
3. They can purchase commercial license templates from our shop
4. After enrollment, they receive an email with login credentials to access our dashboard

The dashboard must serve as a comprehensive hub for all these resources and provide clear guidance for students who are new to paper products business.

## Future State Goal
A premium student experience system tailored to our exclusive offering:

1. **Comprehensive Student Dashboard**
   - Award-winning, intuitive student dashboard based on our `dashboard2` implementation
   - Clear access to Papers to Profits course with progress tracking
   - Integrated Google Drive templates library viewer
   - Shopify purchase history integration
   - Live class schedule and Zoom integration
   - Informative onboarding for new students

2. **Access Control & Enrollment**
   - JWT-based validation middleware for secure content access
   - Seamless connection between landing page payments (Xendit) and account creation
   - Email notification system with login credentials

3. **Progress Tracking**
   - High-quality progress tracking visualization
   - Module-level and lesson-level completion recording
   - Time spent metrics and analytics

4. **Administration**
   - Enhanced enrollment management connected to user database
   - Student engagement analytics
   - Integration with Xendit/Shopify payment confirmation

## Breaking Down the Build

Due to the complexity of this project, we'll divide it into five separate build notes:

1. **Student Dashboard Implementation** (This document)
2. **[Dashboard Refactoring](./platform-integration_phase2-2-1_dashboard-refactoring.md)**
3. **[Enrollment & Access Control](./platform-integration_phase2-3_enrollment-access-control.md)**
4. **[Admin Experience & Analytics](./platform-integration_phase2-4_admin-experience.md)**
5. **[Shopify Purchase Integration](./platform-integration_phase2-5_shopify-purchase-integration.md)**

---

# Implementation Plan

### 1. Data Layer Implementation

- [x] Create prototype dashboard at `/app/dashboard2/page.tsx` with the following features:
  - Welcome modal and onboarding tour for new users
  - Course progress visualization with continue learning section
  - Templates library with Google Drive integration
  - Recent purchases display from Shopify
  - Live class schedule with Zoom integration
  - Announcement system
  - Mobile-responsive design with collapsible sections

- [x] Create Zustand store for enrollment and dashboard state: 
  - [x] Create `lib/stores/student-dashboard/index.ts` with proper state management
  - [x] Implement user enrollment state management
  - [x] Implement course progress tracking
  - [x] Implement template library state management
  - [ ] Implement purchase history integration

- [x] Implement data access hooks and functions:
  - [x] Create enhanced `useUserEnrollments` hook with SWR pattern
  - [x] Create `useUserProgress` hook for course and lesson progress
  - [x] Standardize Supabase client implementation for proper type-safety:
    - Refactored all data access functions to use `createServerSupabaseClient`
    - Updated client-side hooks to use `getBrowserClient` for consistent implementation
    - Fixed dependency arrays in useEffect hooks for proper cleanup
  - [x] Create utility functions for calculating progress percentages:
    - Created `lib/utils/progress-utils.ts` with comprehensive progress calculation functions
    - Implemented course/module progress calculation, time remaining calculation, and UI formatting
  - [x] Create data access functions for Google Drive templates:
    - Implemented `lib/supabase/data-access/templates.ts` with template fetching functions
    - Added `lib/hooks/use-templates.ts` with SWR integration for data fetching and caching
  - [ ] Create data access functions for purchase history

- [x] Extract components from the large dashboard page:
  - [x] `StudentHeader` in `/components/dashboard/student-header.tsx`
  - [x] `GoogleDriveViewer` in `/components/dashboard/google-drive-viewer.tsx`
  - [x] `CourseProgressSection` in `/components/dashboard/course-progress-section.tsx`
  - [x] `TemplatesSection` in `/components/dashboard/templates-section.tsx` (implemented as `TemplateBrowser` and `TemplatePreviewModal`)
  - [x] `PurchasesSection` in `/components/dashboard/purchases-section.tsx`
  - [x] `LiveClassesSection` in `/components/dashboard/live-classes-section.tsx`
  - [x] `SupportSection` in `/components/dashboard/support-section.tsx`
  - [x] `CommunitySection` in `/components/dashboard/community-section.tsx`
  - [x] `OnboardingTour` in `/components/dashboard/onboarding-tour.tsx`
  - [x] `WelcomeModal` in `/components/dashboard/welcome-modal.tsx`

### 2. Connect Dashboard to Real Data Sources

- [x] Replace mock student data with authenticated user data:
  - [x] Add authentication context to dashboard page
  - [x] Fetch and display real user profile data
  - [x] Handle loading and error states for user data

- [x] Replace mock course progress with actual progress from database:
  - [x] Create functions to fetch enrollments data for the authenticated user
  - [x] Implement progress tracking utilities in `lib/utils/progress-utils.ts`
  - [x] Integrate real enrollment data into dashboard components
  - [x] Fix TypeScript errors related to CourseProgress type
  - [x] Implement helper functions for calculating time spent based on completed lessons
  - [x] Add fallback values to handle potential undefined values in the data

- [x] Connect templates library to actual Google Drive API:
  - [x] Implement template library integration for Templates section:
  - [x] Create data access layer for Google Drive files
  - [x] Create hooks for template browsing with search and filtering
  - [x] Create template browser component:
    - Implemented `components/dashboard/template-browser.tsx` with grid layout display
    - Added search functionality, filtering by category, and pagination support
  - [x] Add search and filtering UI functionality
  - [x] Implement template preview modal:
    - Created `components/dashboard/template-preview-modal.tsx` with preview iframe
    - Added download functionality and Google Drive integration
  - [x] Integrate template browser and preview modal into the dashboard page

- [ ] Connect purchases history to Shopify API:
  - [ ] **Moved to separate build note**: [Shopify Purchase Integration](./platform-integration_phase2-5_shopify-purchase-integration.md)

- [ ] Connect live classes to actual calendar/events
  
- [ ] Finalize styles and animations
  - [ ] Ensure consistent branding and color scheme
  - [ ] Optimize animations for performance
  - [ ] Ensure proper responsive behavior on all devices

### 2. Access Control Implementation
- [ ] Create centralized middleware in `/lib/middleware/course-access-validation.ts`:
  ```typescript
  // Following our existing middleware pattern:
  import { NextRequest, NextResponse } from 'next/server';
  import { createServerClient } from '@supabase/ssr';
  import { getUserEnrollments } from '@/lib/supabase/data-access';

  export async function validateEnrollment({
    userId,
    courseId
  }: {
    userId: string;
    courseId: string;
  }) {
    try {
      // Use existing data access function to check enrollment
      const enrollments = await getUserEnrollments(userId);
      const hasAccess = enrollments.some(enrollment =>
        enrollment.course_id === courseId &&
        enrollment.status === 'active' &&
        (!enrollment.expires_at || new Date(enrollment.expires_at) > new Date())
      );

      return { hasAccess };
    } catch (error) {
      console.error('Error validating enrollment:', error);
      return { hasAccess: false, error };
    }
  }
  ```
- [ ] Add course content validation in `/app/api/courses/` routes
- [ ] Enhance existing client-side enrollment hooks in `/lib/hooks/use-enrollment.ts`
  ```typescript
  // Enhanced hook with SWR pattern and additional functionality
  import useSWR from 'swr';
  import { useAuth } from '@/context/auth-context';

  export function useEnrollments(options?: { courseId?: string }) {
    const { user } = useAuth();
    const userId = user?.id;

    // Build the SWR key based on options
    const key = userId ?
      options?.courseId ?
        `/api/users/${userId}/enrollments?courseId=${options.courseId}` :
        `/api/users/${userId}/enrollments` :
      null;

    // Use SWR for data fetching with proper caching
    const { data, error, isLoading, mutate } = useSWR(
      key,
      async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch enrollments');
        return response.json();
      },
      {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 10000, // 10 seconds
      }
    );

    // Helper function to check enrollment in a specific course
    const isEnrolledInCourse = useCallback((courseId: string) => {
      if (!data?.enrollments || isLoading) return false;
      return data.enrollments.some(enrollment =>
        enrollment.course_id === courseId &&
        enrollment.status === 'active'
      );
    }, [data, isLoading]);

    return {
      enrollments: data?.enrollments || [],
      isLoading,
      error,
      refresh: mutate,
      isEnrolledInCourse,
    };
  }
  ```
- [ ] Create higher-order component for protected routes:
  ```tsx
  // Based on our existing auth protection patterns
  import { useRouter } from 'next/navigation';
  import { useAuth } from '@/context/auth-context';
  import { useEnrollments } from '@/lib/hooks/use-enrollment';

  export function withEnrollmentProtection(Component: React.ComponentType, courseId: string) {
    return function EnrollmentProtected(props: any) {
      const router = useRouter();
      const { user, isLoading: authLoading } = useAuth();
      const { isEnrolledInCourse, isLoading: enrollmentLoading } = useEnrollments({ courseId });

      // Show loading state while checking auth and enrollment
      if (authLoading || enrollmentLoading) {
        return <div>Loading...</div>; // Use our loading component
      }

      // Redirect if not authenticated
      if (!user) {
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
        return null;
      }

      // Redirect if not enrolled
      if (!isEnrolledInCourse(courseId)) {
        router.push(`/courses/${courseId}?access=denied`);
        return null;
      }

      // User is authenticated and enrolled, render the component
      return <Component {...props} />;
### 3. Progress Tracking System

- [ ] Create new tables for comprehensive tracking in `/db/migrations/04_progress_tracking_tables.sql`:
  ```sql
  -- Create new course_progress table for course-level tracking
  CREATE TABLE IF NOT EXISTS public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    percent_complete NUMERIC NOT NULL DEFAULT 0,
    completed_modules INTEGER DEFAULT 0,
    total_modules INTEGER DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, course_id)
  );

  -- Create module_progress table for module-level tracking
  CREATE TABLE IF NOT EXISTS public.module_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    percent_complete NUMERIC NOT NULL DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, module_id)
  );

  -- Add RLS policies for progress tables
  ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

  -- Users can view their own progress
  CREATE POLICY course_progress_view_own ON public.course_progress
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY module_progress_view_own ON public.module_progress
    FOR SELECT USING (auth.uid() = user_id);

  -- Admins can view all progress
  CREATE POLICY course_progress_admin_view ON public.course_progress
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

  CREATE POLICY module_progress_admin_view ON public.module_progress
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  ```

- [ ] Create database functions to calculate and update progress:
  ```sql
  -- Function to update module progress based on lesson completions
  CREATE OR REPLACE FUNCTION public.update_module_progress()
  RETURNS TRIGGER AS $$
  BEGIN
    -- Get the module_id for this lesson
    DECLARE module_id UUID;
    DECLARE course_id UUID;
    DECLARE total_lessons INTEGER;
    DECLARE completed_lessons INTEGER;

    SELECT l.module_id, m.course_id INTO module_id, course_id
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE l.id = NEW.lesson_id;

    -- Count total and completed lessons in this module
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons
    WHERE module_id = module_id;

    SELECT COUNT(*) INTO completed_lessons
    FROM public.user_progress
    WHERE user_id = NEW.user_id
      AND lesson_id IN (SELECT id FROM public.lessons WHERE module_id = module_id)
      AND status = 'completed';

    -- Calculate percentage
    DECLARE percent NUMERIC := 0;
    IF total_lessons > 0 THEN
      percent := (completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100;
    END IF;

    -- Update or insert module progress
    INSERT INTO public.module_progress (
      user_id, module_id, course_id, percent_complete,
      completed_lessons, total_lessons, last_activity_at
    )
    VALUES (
      NEW.user_id, module_id, course_id, percent,
      completed_lessons, total_lessons, NOW()
    )
    ON CONFLICT (user_id, module_id) DO UPDATE SET
      percent_complete = percent,
      completed_lessons = completed_lessons,
      total_lessons = total_lessons,
      last_activity_at = NOW(),
      completed_at = CASE WHEN percent = 100 AND completed_lessons = total_lessons
                     THEN NOW() ELSE module_progress.completed_at END;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Trigger to update module progress when lesson progress changes
  CREATE TRIGGER update_module_progress_trigger
  AFTER INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_module_progress();

  -- Function to update course progress based on module completions
  CREATE OR REPLACE FUNCTION public.update_course_progress()
  RETURNS TRIGGER AS $$
  BEGIN
    -- Count total and completed modules/lessons in this course
    DECLARE total_modules INTEGER;
    DECLARE completed_modules INTEGER;
    DECLARE total_lessons INTEGER;
    DECLARE completed_lessons INTEGER;

    SELECT COUNT(*) INTO total_modules
    FROM public.modules
    WHERE course_id = NEW.course_id;

    SELECT COUNT(*) INTO completed_modules
    FROM public.module_progress
    WHERE user_id = NEW.user_id
      AND course_id = NEW.course_id
      AND percent_complete = 100;

    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE m.course_id = NEW.course_id;

    SELECT COUNT(*) INTO completed_lessons
    FROM public.user_progress up
    JOIN public.lessons l ON up.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    WHERE up.user_id = NEW.user_id
      AND m.course_id = NEW.course_id
      AND up.status = 'completed';

    -- Calculate percentage
    DECLARE percent NUMERIC := 0;
    IF total_lessons > 0 THEN
      percent := (completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100;
    END IF;

    -- Update or insert course progress
    INSERT INTO public.course_progress (
      user_id, course_id, percent_complete,
      completed_modules, total_modules,
      completed_lessons, total_lessons,
      last_activity_at
    )
    VALUES (
      NEW.user_id, NEW.course_id, percent,
      completed_modules, total_modules,
      completed_lessons, total_lessons,
      NOW()
    )
    ON CONFLICT (user_id, course_id) DO UPDATE SET
      percent_complete = percent,
      completed_modules = completed_modules,
      total_modules = total_modules,
      completed_lessons = completed_lessons,
      total_lessons = total_lessons,
      last_activity_at = NOW(),
      completed_at = CASE WHEN percent = 100 AND completed_lessons = total_lessons
                     THEN NOW() ELSE course_progress.completed_at END;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Trigger to update course progress when module progress changes
  CREATE TRIGGER update_course_progress_trigger
  AFTER INSERT OR UPDATE ON public.module_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_progress();
  ```

- [ ] Implement progress API routes in `/app/api/courses/[courseId]/progress/route.ts`
- [ ] Create progress recording components using our existing patterns:
  ```tsx
  // Enhanced progress tracker hook in lib/hooks/use-progress-tracker.ts
  import { useState, useEffect } from 'react';
  import { useAuth } from '@/context/auth-context';
  import { useSupabaseClient } from '@/lib/supabase/hooks';

  export function useProgressTracker({
    lessonId,
    courseId,
    moduleId,
  }: ProgressTrackerProps) {
    const { user } = useAuth();
    const supabase = useSupabaseClient();
    const [progress, setProgress] = useState<LessonProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Fetch current progress on mount
    useEffect(() => {
      if (!user?.id || !lessonId) return;

      async function fetchProgress() {
        try {
          setIsLoading(true);
          const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .maybeSingle();

          if (error) throw error;
          setProgress(data);
        } catch (err) {
          console.error('Error fetching progress:', err);
          setError(err instanceof Error ? err : new Error('Failed to fetch progress'));
        } finally {
          setIsLoading(false);
        }
      }

      fetchProgress();
    }, [user?.id, lessonId, supabase]);

    // Mark lesson as complete
    const markComplete = async () => {
      if (!user?.id || !lessonId) return;

      try {
        const { data, error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        setProgress(data);
        return data;
      } catch (err) {
        console.error('Error marking lesson complete:', err);
        throw err;
      }
    };

    // Update progress percentage
    const updateProgress = async (percentage: number) => {
      if (!user?.id || !lessonId) return;

      try {
        const { data, error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            status: percentage >= 100 ? 'completed' : 'in_progress',
            progress_percentage: percentage,
            completed_at: percentage >= 100 ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (error) throw error;
        setProgress(data);
        return data;
      } catch (err) {
        console.error('Error updating progress:', err);
        throw err;
      }
    };

    // Record current position in video or content
    const recordPosition = async (position: number) => {
      if (!user?.id || !lessonId) return;

      try {
        const { data, error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            last_position: position,
            status: progress?.status || 'in_progress',
            progress_percentage: progress?.progress_percentage || 0,
          })
          .select()
          .single();

        if (error) throw error;
        setProgress(data);
        return data;
      } catch (err) {
        console.error('Error recording position:', err);
        throw err;
      }
    };

    return {
      progress,
      isLoading,
      error,
      markComplete,
      updateProgress,
      recordPosition,
    };
  }
  ```

- [ ] Build progress visualization components in `/components/courses/progress/`:
  ```tsx
  // CourseProgressBar.tsx
  import { Progress } from '@/components/ui/progress';
  import { useCourseProgress } from '@/lib/hooks/use-course-progress';

  export function CourseProgressBar({ courseId }: { courseId: string }) {
    const { progress, isLoading } = useCourseProgress(courseId);

    if (isLoading) {
      return <Progress value={0} className="w-full" />;
    }

    return (
      <div className="space-y-2">
        <Progress value={progress?.percent_complete || 0} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress?.completed_lessons || 0} of {progress?.total_lessons || 0} lessons completed</span>
          <span>{Math.round(progress?.percent_complete || 0)}%</span>
        </div>
      </div>
    );
  }
  ```

### 4. Premium Progress Tracking

- [ ] Enhance existing progress tracking system in `/db/migrations/04_progress_tracking_enhancement.sql`:
  ```sql
  -- Enhance existing course_progress table for premium tracking
  CREATE TABLE IF NOT EXISTS public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    percent_complete NUMERIC NOT NULL DEFAULT 0,
    completed_modules INTEGER DEFAULT 0,
    total_modules INTEGER DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, course_id)
  );
  ```

### 4. Enrollment Lifecycle Management

- [ ] Extend enrollment model with `renewal_at`, `notification_sent_at` fields
- [ ] Create automated expiration check function in `/lib/cron/check-enrollments.ts`
- [ ] Implement notifications using our existing pattern:
  ```typescript
  // Following our toast notification pattern
  export async function sendEnrollmentNotification({
    userId,
    courseId,
    type
  }: EnrollmentNotificationProps) {
    // Implementation using our existing notification system
    // ...
  }
  ```
- [ ] Add renewal API endpoints in `/app/api/courses/[courseId]/enrollments/renew`

### 5. Student Engagement Automation

- [ ] Create engagement tracking function in `/lib/analytics/student-engagement.ts`
- [ ] Implement notifications using our existing pattern:
  ```typescript
  // Following our toast notification pattern
  export async function sendEnrollmentNotification({
    userId,
    courseId,
    type
  }: EnrollmentNotificationProps) {
    // Implementation using our existing notification system
    // ...
  }
  ```
- [ ] Implement `CourseProgressOverview` component
- [ ] Add enrollment management interface for students

### 6. Enhanced Admin Interface

- [ ] Expand existing admin interface at `/app/admin/courses/` to include enrollment management
- [ ] Create dedicated enrollment dashboard component:
  - Connect to users database to verify and manage enrollments
  - Add student search and filtering capabilities
  - Display enrollment status with verification options
- [ ] Create student engagement analytics dashboard
- [ ] Implement reports generation system

### 8. Database Optimization

- [ ] Add recommended indexes to improve query performance:
  ```sql
  -- Indexes for user_enrollments table
  CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON public.user_enrollments(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_enrollments_course_id ON public.user_enrollments(course_id);
  CREATE INDEX IF NOT EXISTS idx_user_enrollments_status ON public.user_enrollments(status);
  CREATE INDEX IF NOT EXISTS idx_user_enrollments_expires_at ON public.user_enrollments(expires_at);

  -- Composite indexes for common query patterns
  CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_course ON public.user_enrollments(user_id, course_id);
  CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_status ON public.user_enrollments(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_user_enrollments_course_status ON public.user_enrollments(course_id, status);

  -- Indexes for user_progress table
  CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON public.user_progress(lesson_id);
  CREATE INDEX IF NOT EXISTS idx_user_progress_status ON public.user_progress(status);

  -- Composite indexes for progress queries
  CREATE INDEX IF NOT EXISTS idx_user_progress_user_lesson ON public.user_progress(user_id, lesson_id);

  -- Indexes for course_progress table (once created)
  CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON public.course_progress(user_id);
  CREATE INDEX IF NOT EXISTS idx_course_progress_course_id ON public.course_progress(course_id);
  CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON public.course_progress(user_id, course_id);
  ```
- Implement proper caching for enrollment status checks
- Use optimistic UI updates for enrollment operations

### State Management

- Implement a comprehensive Zustand store for student dashboard state in `/lib/stores/student-dashboard/index.ts`:
  ```typescript
  // Based on our existing course store pattern in lib/stores/course.ts
  import { create } from 'zustand';
  import { persist } from 'zustand/middleware';
  import { createDashboardSelectors } from './selectors';
  import type { StudentCourse, ShopifyPurchase, DashboardState } from './types';
  import {
    fetchEnrolledCourses,
    fetchShopifyPurchases,
    fetchCourseProgress,
    updateLastAccessed,
  } from './api';

  export const useStudentDashboardStore = create<DashboardState>()((
    persist(
      (set, get) => ({
        // Initial state
        enrolledCourses: [],
        isLoading: boolean;
        error: Error | null;
        lastFetched: number | null;

        // Cached data for quick access
        enrolledCoursesByCourseId: Record<string, StudentCourse>;

        // Actions
        fetchEnrolledCourses: (userId: string, force?: boolean) => Promise<StudentCourse[]>;
        fetchShopifyPurchases: (userId: string) => Promise<ShopifyPurchase[]>;
        fetchCourseProgress: (courseId: string) => Promise<CourseProgress>;
        updateLastAccessed: (courseId: string) => Promise<void>;
        clearCache: () => void;
      }),
      {
        name: 'student-dashboard-store',
        partialize: (state) => ({
          // Only persist the cache, not loading states or errors
          enrolledCoursesByCourseId: state.enrolledCoursesByCourseId,
          lastFetched: state.lastFetched
        })
      }
    )
  );
  ```
- Create API functions for the store in `/lib/stores/student-dashboard/api.ts`:
  ```typescript
  import { StudentCourse, ShopifyPurchase } from './types';

  export async function fetchEnrolledCourses(userId: string): Promise<StudentCourse[]> {
    const response = await fetch(`/api/users/${userId}/enrollments`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch enrollments');
    }

    const data = await response.json();
    return data.enrollments || [];
  }

  export async function fetchShopifyPurchases(userId: string): Promise<ShopifyPurchase[]> {
    const response = await fetch(`/api/users/${userId}/purchases`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch purchases');
    }

    const data = await response.json();
    return data.purchases || [];
  }

  export async function fetchCourseProgress(courseId: string): Promise<CourseProgress> {
    const response = await fetch(`/api/courses/${courseId}/progress`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch course progress');
    }

    const data = await response.json();
    return data.progress || {};
  }

  export async function updateLastAccessed(courseId: string): Promise<void> {
    const response = await fetch(`/api/courses/${courseId}/last-accessed`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update last accessed');
    }
  }
  ```
- Define types in `/lib/stores/student-dashboard/types.ts`:
  ```typescript
  export type StudentCourse = {
    id: string;
    title: string;
    slug: string;
    thumbnail_url?: string;
    progress: CourseProgress;
  };

  export type ShopifyPurchase = {
    id: string;
    course_id: string;
    user_id: string;
    created_at: string;
  };

  export type CourseProgress = {
    percent_complete: number;
    completed_modules: number;
    total_modules: number;
    completed_lessons: number;
    total_lessons: number;
    last_activity_at: string;
  };

  export type DashboardState = {
    enrolledCourses: StudentCourse[];
    enrolledCoursesByCourseId: Record<string, StudentCourse>;
    isLoading: boolean;
    error: Error | null;
    lastFetched: number | null;
  };
  ```

## Completion Status

This phase is in the early stages of implementation. The following has been accomplished:

- ✅ Basic database structure for enrollments is in place
- ✅ RLS policies for enrollment security are implemented
- ✅ Admin API routes for enrollment management are functional
- ✅ Admin UI for enrollment management is complete
- ✅ Basic user_progress table exists (though not with ideal schema)
- ✅ Basic data access functions for enrollments exist in `lib/supabase/data-access.ts`
- ✅ Simple client-side hook for enrollments exists in `lib/supabase/hooks.ts`
- ✅ Basic access control checks in course pages

### 2. Google Drive Templates Integration

- [x] Implement GoogleDriveViewer component:
  ```tsx
  // In components/dashboard/google-drive-viewer.tsx
  'use client';
  import { useState, useEffect } from 'react';
  import { Card } from '@/components/ui/card';
  import { Button } from '@/components/ui/button';
  import { Download, FileText, ExternalLink } from 'lucide-react';
  
  interface GoogleDriveViewerProps {
    fileId: string;
    fileName: string;
    fileType: string;
  }
  
  export function GoogleDriveViewer({ fileId, fileName, fileType }: GoogleDriveViewerProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Generate Google Drive preview URL
    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <h3 className="font-medium text-gray-800">{fileName}</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={downloadUrl} download>
                <Download className="h-4 w-4 mr-1" /> Download
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`https://drive.google.com/file/d/${fileId}/view`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Open in Drive
              </a>
            </Button>
          </div>
        </div>
        
        <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50 min-h-[500px]">
          {isLoading && <div className="w-full h-full flex items-center justify-center">Loading preview...</div>}
          {error && <div className="w-full h-full flex items-center justify-center text-red-500">{error}</div>}
          <iframe 
            src={previewUrl}
            className="w-full h-full"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load preview');
            }}
            allow="autoplay"
          ></iframe>
        </div>
      </div>
    );
  }
  ```

- [ ] Create Templates API endpoints:
  - [ ] `/api/templates` - List all templates available to the user
  - [ ] `/api/templates/[templateId]` - Get specific template details including Google Drive ID

- [ ] Implement Template Database Schema:
  ```sql
  CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    google_drive_id TEXT NOT NULL,
    category TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size INTEGER,
    file_type TEXT NOT NULL,
    is_free BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  CREATE TABLE public.user_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, template_id)
  );
  ```

### 3. Shopify Integration

- [ ] Create Shopify API client in `/lib/shopify/client.ts`
- [ ] Implement purchase history fetching:
  ```typescript
  // In lib/shopify/orders.ts
  import { shopifyClient } from './client';
  
  export async function getUserOrders(email: string) {
    try {
      // Fetch orders for the customer with the given email
      const response = await shopifyClient.get(`/customers/search.json?query=email:${encodeURIComponent(email)}`);
      const customer = response.data.customers[0];
      
      if (!customer) {
        return [];
      }
      
      const ordersResponse = await shopifyClient.get(`/customers/${customer.id}/orders.json?status=any`);
      return ordersResponse.data.orders;
    } catch (error) {
      console.error('Error fetching Shopify orders:', error);
      throw new Error('Failed to fetch purchase history');
    }
  }
  ```

## Data Model

We'll need to enhance our database with the following tables and changes:

```sql
-- Add last_accessed tracking to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS last_accessed_count INTEGER DEFAULT 0;

-- Add time_spent tracking
CREATE TABLE IF NOT EXISTS public.user_time_spent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id, session_date)
);

-- Create live classes table
CREATE TABLE IF NOT EXISTS public.live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  zoom_link TEXT,
  instructor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  publish_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Completion Status

Current progress status:

- [x] Created prototype dashboard at `/app/dashboard2/page.tsx` with mock data
- [ ] Implementing required components based on the prototype
- [ ] Connecting to real data sources (user data, course progress, templates, purchases)
- [ ] Finalizing styles and animations

Next immediate priorities:
1. Complete the implementation of all dashboard components
2. Connect to actual data sources replacing mock data
3. Implement Google Drive integration for templates library
4. Integrate with Shopify for purchase history

## Next Steps

After completing the Student Dashboard implementation, we will proceed to:

1. **Enrollment & Access Control** (Phase 2-3) - Focus on the connection between Xendit payments, account creation, and course access.
2. **Admin Experience & Analytics** (Phase 2-4) - Develop the administrative interface for monitoring student progress and managing enrollments.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
