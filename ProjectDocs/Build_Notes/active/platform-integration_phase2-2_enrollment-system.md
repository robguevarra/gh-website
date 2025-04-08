# Platform Integration - Phase 2-2: Enrollment System

## Task Objective
Develop a comprehensive, industry-standard enrollment system that seamlessly manages student registration, access control, and progress tracking while integrating with our existing codebase patterns and components.

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
- ❌ Student-facing enrollment flow with post-payment integration
- ❌ Enhanced `useEnrollment` hook with SWR pattern and additional functionality
- ❌ Course-level progress tracking (vs. current lesson-level only)
- ❌ Student dashboard for enrolled courses
- ❌ Centralized access control middleware for protected content
- ❌ Enrollment lifecycle automation (expiration, renewal)
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

## Future State Goal
A full-featured enrollment system following LMS industry standards:

1. **Student Experience**
   - Consistent enrollment flow across marketing pages and course catalog
   - Clear enrollment status and expiration information
   - Seamless access to purchased courses
   - Visual progress tracking

2. **Access Control**
   - JWT-based validation middleware for course content
   - Fine-grained permissions at module/lesson level
   - Expiration handling with grace period options

3. **Progress Tracking**
   - Industry-standard SCORM-like completion tracking
   - Module-level and lesson-level progress recording
   - Aggregated statistics and reporting

4. **Administration**
   - Enhanced enrollment management
   - Bulk operations for enrollment administration
   - Revenue and engagement analytics

## Implementation Plan

### 1. Enhanced Student Enrollment Flow
- [ ] Leverage and extend existing course preview functionality from `app/admin/courses/page.tsx`
- [ ] Implement `CourseEnrollmentFlow` component in `/components/courses/`
  ```tsx
  // Structure follows our existing pattern:
  'use client';
  import { useState } from 'react';
  import { Button } from '@/components/ui/button';
  import { Card } from '@/components/ui/card';
  import { useRouter } from 'next/navigation';
  import { Badge } from '@/components/ui/badge';

  export function CourseEnrollmentFlow({
    courseId,
    courseName,
    price,
    description,
    status
  }: CourseEnrollmentFlowProps) {
    // State management using our existing patterns
    const [isEnrolling, setIsEnrolling] = useState(false);

    // Implement enrollment logic following xendit-payment.tsx pattern
    // ...
  }
  ```
- [ ] Enhance course preview with more detailed information and enrollment options
- [ ] Implement course catalog in `/app/(authenticated)/courses/page.tsx`
  - Use our existing Card, Badge, and Button components from admin interface
  - Create ServerComponent for initial data loading with SWR for dynamic updates

### 2. Access Control Implementation
- [ ] Create centralized middleware in `/lib/middleware/enrollment-validation.ts`:
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
    };
  }
  ```

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

### 5. Payment Integration Enhancement
- [ ] Update Xendit integration to handle enrollment creation in `components/checkout/xendit-payment.tsx`:
  ```typescript
  // Extending our existing payment completion handler in xendit-payment.tsx
  import { enrollUserInCourse } from '@/lib/supabase/data-access';
  import { addDays, format } from 'date-fns';
  import { toast } from '@/components/ui/use-toast';

  async function handlePaymentCompletion(paymentData) {
    try {
      // Get course duration from course settings or use default
      const { data: courseSettings } = await supabaseClient
        .from('courses')
        .select('access_duration_days, title')
        .eq('id', courseId)
        .single();

      const courseDurationDays = courseSettings?.access_duration_days || 365; // Default to 1 year
      const expiryDate = addDays(new Date(), courseDurationDays);

      // Use our existing data access function to create enrollment
      const enrollment = await enrollUserInCourse(user.id, courseId, paymentData.id);

      // Update enrollment with expiration date
      const { error: updateError } = await supabaseClient
        .from('user_enrollments')
        .update({
          expires_at: expiryDate.toISOString(),
        })
        .eq('id', enrollment.id);

      if (updateError) throw updateError;

      // Show success message
      toast({
        title: 'Enrollment Successful!',
        description: `You now have access to ${courseSettings?.title} until ${format(expiryDate, 'PPP')}.`,
        variant: 'default',
      });

      // Redirect to course or dashboard
      router.push(`/courses/${courseSlug}/learn`);
    } catch (error) {
      console.error('Error creating enrollment:', error);
      toast({
        title: 'Enrollment Error',
        description: 'There was a problem creating your enrollment. Please contact support.',
        variant: 'destructive',
      });
    }
  }
  ```
- [ ] Create API route for enrollment creation after payment in `/app/api/payments/webhook/route.ts`:
  ```typescript
  // Handle payment webhooks from Xendit
  import { NextRequest, NextResponse } from 'next/server';
  import { createServiceRoleClient } from '@/lib/supabase/client';
  import { addDays } from 'date-fns';

  export async function POST(request: NextRequest) {
    try {
      // Verify webhook signature (implementation depends on payment provider)
      const body = await request.json();

      // Process successful payments only
      if (body.status === 'SUCCEEDED') {
        const supabase = createServiceRoleClient();

        // Extract metadata from payment
        const { userId, courseId, courseDurationDays = 365 } = body.metadata || {};

        if (!userId || !courseId) {
          return NextResponse.json({ error: 'Missing user or course information' }, { status: 400 });
        }

        // Calculate expiration date
        const expiryDate = addDays(new Date(), courseDurationDays);

        // Create enrollment
        const { data, error } = await supabase
          .from('user_enrollments')
          .insert({
            user_id: userId,
            course_id: courseId,
            status: 'active',
            payment_id: body.id,
            expires_at: expiryDate.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ success: true, enrollment: data });
      }

      return NextResponse.json({ success: true, status: 'ignored' });
    } catch (error) {
      console.error('Payment webhook error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
  ```
- [ ] Implement discount code system following our form validation patterns
- [ ] Create pricing tier support in course settings

### 6. Student Dashboard
- [ ] Build dashboard in `/app/(authenticated)/dashboard/`
- [ ] Create `EnrolledCourseCard` component in `/components/dashboard/`
  ```tsx
  // Following our existing card pattern
  export function EnrolledCourseCard({
    enrollment,
    progress
  }: EnrolledCourseCardProps) {
    // Implementation using our Card component and progress visualization
    // ...
  }
  ```
- [ ] Implement `CourseProgressOverview` component
- [ ] Add enrollment management interface for students

### 7. Admin Enhancement
- [ ] Expand existing `CourseEnrollmentManagement` component:
  - Add bulk operations (CSV import/export)
  - Enhance filtering with date ranges
  - Add advanced search capabilities
- [ ] Create enrollment analytics dashboard
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
- [ ] Create database migration script in `/db/migrations/05_enrollment_indexes.sql`
- [ ] Add function to check and optimize slow queries:
  ```typescript
  // In lib/supabase/admin.ts
  export async function analyzeEnrollmentQueries() {
    const adminClient = createServiceRoleClient();

    // Run EXPLAIN ANALYZE on common enrollment queries
    const { data, error } = await adminClient.rpc('analyze_enrollment_queries');

    if (error) {
      console.error('Error analyzing queries:', error);
      return null;
    }

    return data;
  }
  ```

## Technical Considerations

### Database Optimization
- Use proper indexing on enrollment-related tables
- Consider adding indexes for common query patterns
- Implement efficient query patterns for enrollment status checks
- Optimize enrollment-course-user joins for performance

### Security Implementation
- Follow our existing Row Level Security pattern for all new tables
- Implement JWT validation middleware for all protected content
- Add comprehensive audit logging for enrollment operations

### Performance Optimization
- Use our existing SWR pattern for enrollment data:
  ```tsx
  // Following our data fetching pattern
  const { data: enrollments, error, isLoading, mutate } = useSWR(
    userId ? `/api/users/${userId}/enrollments` : null,
    fetcher
  );
  ```
- Implement proper caching for enrollment status checks
- Use optimistic UI updates for enrollment operations

### State Management
- Implement a comprehensive Zustand store for enrollment state in `/lib/stores/enrollment/index.ts`:
  ```typescript
  // Based on our existing course store pattern in lib/stores/course.ts
  import { create } from 'zustand';
  import { persist } from 'zustand/middleware';
  import { Enrollment, EnrollmentStatus } from './types';
  import { fetchUserEnrollments, fetchEnrollmentByCourse, updateEnrollmentStatus } from './api';

  interface EnrollmentState {
    // State
    enrollments: Enrollment[];
    isLoading: boolean;
    error: Error | null;
    lastFetched: number | null;

    // Cached data for quick access
    enrollmentsByCourseId: Record<string, Enrollment>;

    // Actions
    fetchEnrollments: (userId: string, force?: boolean) => Promise<Enrollment[]>;
    fetchEnrollmentByCourse: (userId: string, courseId: string) => Promise<Enrollment | null>;
    updateEnrollment: (enrollmentId: string, data: Partial<Enrollment>) => Promise<void>;
    checkEnrollmentAccess: (courseId: string) => boolean;
    clearCache: () => void;
  }

  export const useEnrollmentStore = create<EnrollmentState>()(
    persist(
      (set, get) => ({
        // Initial state
        enrollments: [],
        isLoading: false,
        error: null,
        lastFetched: null,
        enrollmentsByCourseId: {},

        // Actions
        fetchEnrollments: async (userId: string, force = false) => {
          // Check if we need to fetch or can use cached data
          const { lastFetched, enrollments } = get();
          const now = Date.now();
          const cacheAge = lastFetched ? now - lastFetched : Infinity;

          // Use cache if available and less than 5 minutes old, unless force refresh
          if (!force && lastFetched && cacheAge < 5 * 60 * 1000 && enrollments.length > 0) {
            return enrollments;
          }

          set({ isLoading: true, error: null });

          try {
            // Use our API function to fetch enrollments
            const data = await fetchUserEnrollments(userId);

            // Create lookup map for quick access by course ID
            const enrollmentsByCourseId = data.reduce((acc, enrollment) => {
              acc[enrollment.course_id] = enrollment;
              return acc;
            }, {} as Record<string, Enrollment>);

            set({
              enrollments: data,
              enrollmentsByCourseId,
              isLoading: false,
              lastFetched: now
            });

            return data;
          } catch (error) {
            set({ error: error as Error, isLoading: false });
            throw error;
          }
        },

        fetchEnrollmentByCourse: async (userId: string, courseId: string) => {
          // Check if we have it in cache first
          const { enrollmentsByCourseId } = get();
          if (enrollmentsByCourseId[courseId]) {
            return enrollmentsByCourseId[courseId];
          }

          try {
            // Fetch specific enrollment
            const enrollment = await fetchEnrollmentByCourse(userId, courseId);

            // Update cache if found
            if (enrollment) {
              set(state => ({
                enrollmentsByCourseId: {
                  ...state.enrollmentsByCourseId,
                  [courseId]: enrollment
                }
              }));
            }

            return enrollment;
          } catch (error) {
            console.error('Error fetching enrollment by course:', error);
            return null;
          }
        },

        updateEnrollment: async (enrollmentId: string, data: Partial<Enrollment>) => {
          try {
            // Update enrollment via API
            const updatedEnrollment = await updateEnrollmentStatus(enrollmentId, data);

            // Update local state
            set(state => ({
              enrollments: state.enrollments.map(e =>
                e.id === enrollmentId ? { ...e, ...updatedEnrollment } : e
              ),
              enrollmentsByCourseId: {
                ...state.enrollmentsByCourseId,
                [updatedEnrollment.course_id]: updatedEnrollment
              }
            }));
          } catch (error) {
            console.error('Error updating enrollment:', error);
            throw error;
          }
        },

        checkEnrollmentAccess: (courseId: string) => {
          const { enrollmentsByCourseId } = get();
          const enrollment = enrollmentsByCourseId[courseId];

          if (!enrollment) return false;

          // Check if enrollment is active and not expired
          const isActive = enrollment.status === 'active';
          const isExpired = enrollment.expires_at ?
            new Date(enrollment.expires_at) < new Date() : false;

          return isActive && !isExpired;
        },

        clearCache: () => set({
          enrollmentsByCourseId: {},
          lastFetched: null
        })
      }),
      {
        name: 'enrollment-store',
        partialize: (state) => ({
          // Only persist the cache, not loading states or errors
          enrollmentsByCourseId: state.enrollmentsByCourseId,
          lastFetched: state.lastFetched
        })
      }
    )
  );
  ```

- Create API functions for the store in `/lib/stores/enrollment/api.ts`:
  ```typescript
  import { Enrollment } from './types';

  export async function fetchUserEnrollments(userId: string): Promise<Enrollment[]> {
    const response = await fetch(`/api/users/${userId}/enrollments`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch enrollments');
    }

    const data = await response.json();
    return data.enrollments || [];
  }

  export async function fetchEnrollmentByCourse(
    userId: string,
    courseId: string
  ): Promise<Enrollment | null> {
    const response = await fetch(`/api/users/${userId}/enrollments?courseId=${courseId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch enrollment');
    }

    const data = await response.json();
    return data.enrollments?.[0] || null;
  }

  export async function updateEnrollmentStatus(
    enrollmentId: string,
    data: Partial<Enrollment>
  ): Promise<Enrollment> {
    const response = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update enrollment');
    }

    const updatedEnrollment = await response.json();
    return updatedEnrollment;
  }
  ```

- Define types in `/lib/stores/enrollment/types.ts`:
  ```typescript
  export type EnrollmentStatus = 'active' | 'suspended' | 'cancelled' | 'expired';

  export interface Enrollment {
    id: string;
    user_id: string;
    course_id: string;
    enrolled_at: string;
    expires_at: string | null;
    status: EnrollmentStatus;
    payment_id: string | null;
    created_at: string;
    updated_at: string;
    course?: {
      id: string;
      title: string;
      slug: string;
      thumbnail_url?: string;
    };
  }
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

Key challenges to address:
- Enhancing the existing enrollment hooks with SWR pattern and additional functionality
- Connecting payment processing with enrollment creation
- Implementing comprehensive progress tracking beyond lesson level
- Building student-facing enrollment flow and dashboard
- Creating centralized middleware for access validation based on enrollment status
- Implementing Zustand store for enrollment state management

Next immediate priorities:
1. Enhance the existing `useUserEnrollments` hook with SWR pattern in `lib/hooks/use-enrollment.ts`
2. Update payment completion handler to create enrollment records
3. Add recommended database indexes for query optimization
4. Create the enrollment validation middleware
5. Implement the Zustand store for enrollment state management

## Next Steps After Completion

After establishing this enrollment system, we will proceed to Phase 2-3: Payment Integration Enhancement, which will build upon this foundation to implement subscription models, recurring payments, and financial reporting capabilities.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
