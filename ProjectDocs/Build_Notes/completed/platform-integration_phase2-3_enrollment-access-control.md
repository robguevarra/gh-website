# Platform Integration - Phase 2-3: Enrollment & Access Control

## Task Objective
Develop a robust enrollment and access control system that seamlessly connects landing page payments (via Xendit) with user account creation, ensures secure access to course content, and provides a smooth onboarding experience for new students.

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
- ✅ RLS policies for secure access control

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

### Missing Components
- ❌ Integration between Xendit payment completion and enrollment creation
- ❌ Automatic account creation upon successful payment
- ❌ Email notification system with login credentials
- ❌ JWT-based middleware for protected content validation
- ❌ Enrollment lifecycle management

## Current Context
When students make a purchase through our landing page:
1. They complete payment via Xendit
2. Currently, there's a manual process to create accounts
3. Students need login credentials sent via email
4. They need immediate access to Papers to Profits course

This process needs automation and secure integration between payment, account creation, and course access.

## Future State Goal
A seamless enrollment and access control system:

1. **Payment to Account Flow**
   - Automated account creation upon successful Xendit payment
   - Secure password generation and email delivery
   - Immediate enrollment in purchased courses
   - Welcome email with login instructions and onboarding guidance

2. **Access Control**
   - JWT-based validation middleware for course content
   - Fine-grained permissions at module/lesson level
   - Proper authentication flow that protects paid content

3. **User Management**
   - Password reset and account recovery flows
   - Account settings and profile management
   - Enrollment status management

## Implementation Plan

### 1. Xendit-Enrollment Integration

- [ ] Create webhook handler for Xendit payments:
  ```typescript
  // In app/api/webhooks/xendit/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
  import { generatePassword, sendWelcomeEmail } from '@/lib/auth/utils';

  export async function POST(request: NextRequest) {
    try {
      // Verify webhook signature
      const body = await request.json();
      
      // Process only successful payments
      if (body.status === 'PAID') {
        const supabase = createServiceRoleClient();
        const { email, courseId } = body.metadata;
        
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
          
        let userId;
        
        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create a new user
          const password = generatePassword();
          const { data: auth, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          
          if (authError) throw authError;
          
          userId = auth.user.id;
          
          // Send welcome email with login details
          await sendWelcomeEmail({ 
            email, 
            password,
            courseId 
          });
        }
        
        // Create enrollment
        const { error: enrollError } = await supabase
          .from('user_enrollments')
          .insert({
            user_id: userId,
            course_id: courseId,
            status: 'active',
            payment_id: body.id
          });
          
        if (enrollError) throw enrollError;
        
        return NextResponse.json({ success: true });
      }
      
      return NextResponse.json({ success: true, status: 'ignored' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
  ```

- [ ] Implement utility functions for account creation:
  ```typescript
  // In lib/auth/utils.ts
  import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
  import { sendEmail } from '@/lib/email/send-email';

  export function generatePassword() {
    // Generate a secure random password
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  export async function sendWelcomeEmail({ email, password, courseId }) {
    const supabase = createServiceRoleClient();
    
    // Get course details
    const { data: course } = await supabase
      .from('courses')
      .select('title, slug')
      .eq('id', courseId)
      .single();
      
    // Send email with login credentials and course access
    await sendEmail({
      to: email,
      subject: `Welcome to Papers to Profits! Your Access Details`,
      html: `
        <h1>Welcome to Papers to Profits!</h1>
        <p>Your account has been created successfully. Here are your login details:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>Please login at: <a href="https://yourwebsite.com/login">https://yourwebsite.com/login</a></p>
        <p>You now have access to: ${course.title}</p>
        <p>Access your dashboard here: <a href="https://yourwebsite.com/dashboard">https://yourwebsite.com/dashboard</a></p>
        <p>Thank you for joining us!</p>
      `
    });
  }
  ```

- [ ] Configure Xendit webhook in the Xendit dashboard
- [ ] Add metadata fields to payment forms to capture necessary information

### 2. Access Control Middleware

- [ ] Create centralized middleware in `/lib/middleware/course-access-validation.ts`:
  ```typescript
  // In lib/middleware/course-access-validation.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { createClientComponentClient } from '@supabase/ssr';
  
  export async function validateCourseAccess(req: NextRequest) {
    const supabase = createClientComponentClient();
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Extract course ID from the URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const courseIndex = pathParts.findIndex(part => part === 'courses');
    
    if (courseIndex === -1 || !pathParts[courseIndex + 1]) {
      // Not a course page or no course ID
      return NextResponse.next();
    }
    
    const courseSlug = pathParts[courseIndex + 1];
    
    // Check enrollment for this course
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', courseSlug)
      .single();
      
    if (!course) {
      // Course not found
      return NextResponse.redirect(new URL('/404', req.url));
    }
    
    // Check user enrollment
    const { data: enrollment } = await supabase
      .from('user_enrollments')
      .select('status')
      .eq('user_id', session.user.id)
      .eq('course_id', course.id)
      .eq('status', 'active')
      .single();
      
    if (!enrollment) {
      // Not enrolled, redirect to access denied page
      return NextResponse.redirect(new URL('/access-denied', req.url));
    }
    
    // User is enrolled, allow access
    return NextResponse.next();
  }
  ```

- [ ] Implement middleware in Next.js config:
  ```typescript
  // In middleware.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { validateCourseAccess } from '@/lib/middleware/course-access-validation';

  export async function middleware(request: NextRequest) {
    const url = new URL(request.url);
    
    // Apply course access validation only to course content paths
    if (url.pathname.startsWith('/courses')) {
      return validateCourseAccess(request);
    }
    
    return NextResponse.next();
  }

  export const config = {
    matcher: ['/courses/:path*'],
  };
  ```

### 3. Enhanced Enrollment Hooks

- [ ] Enhance useUserEnrollments hook with SWR pattern:
  ```typescript
  // In lib/hooks/use-enrollment.ts
  import useSWR from 'swr';
  import { createClientComponentClient } from '@supabase/ssr';
  
  export function useUserEnrollments(userId: string | undefined) {
    const fetcher = async () => {
      if (!userId) return [];
      
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('user_enrollments')
        .select(`
          id, 
          status, 
          enrolled_at, 
          course:courses (
            id, 
            title, 
            slug, 
            thumbnail_url
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
        
      if (error) throw error;
      return data;
    };
    
    const { data, error, mutate, isLoading } = useSWR(
      userId ? `enrollments-${userId}` : null,
      fetcher,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000, // 1 minute
      }
    );
    
    return {
      enrollments: data || [],
      isLoading,
      error,
      mutate,
    };
  }
  
  export function useEnrollmentStatus(userId: string | undefined, courseId: string | undefined) {
    const { enrollments, isLoading, error } = useUserEnrollments(userId);
    
    const isEnrolled = !isLoading && !error && enrollments.some(
      enrollment => enrollment.course.id === courseId && enrollment.status === 'active'
    );
    
    return {
      isEnrolled,
      isLoading,
      error,
    };
  }
  ```

### 4. User Management Functions

- [ ] Create user profile management functions:
  ```typescript
  // In lib/supabase/data-access.ts
  import { createClientComponentClient } from '@supabase/ssr';
  
  export async function updateUserProfile({ userId, firstName, lastName, profilePicture }) {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        avatar_url: profilePicture,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
      
    if (error) throw error;
    return data;
  }
  
  export async function getUserEnrollments(userId) {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('user_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        course:courses (
          id,
          title,
          slug,
          description,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');
      
    if (error) throw error;
    return data || [];
  }
  ```

- [ ] Implement password reset flow:
  ```typescript
  // In app/api/auth/reset-password/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
  
  export async function POST(request: NextRequest) {
    try {
      const { email } = await request.json();
      
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }
      
      const supabase = createServiceRoleClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      });
      
      if (error) throw error;
      
      return NextResponse.json({
        message: 'Password reset instructions sent to your email'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }
  }
  ```

## Data Model Enhancements

```sql
-- Add more profile information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create user activity tracking
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- login, view_course, complete_lesson, etc.
  activity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user activity lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);
```

## Completion Status

Current progress status:

- [ ] Implementing Xendit webhook integration
- [ ] Creating account creation and welcome email system
- [ ] Developing JWT-based access control middleware
- [ ] Enhancing enrollment hooks with SWR pattern
- [ ] Implementing user profile management

Next immediate priorities:
1. Complete the Xendit webhook implementation
2. Test the end-to-end flow from payment to enrollment
3. Implement and test the access control middleware
4. Enhance user enrollment hooks with optimized data fetching

## Next Steps

After completing the Enrollment & Access Control implementation, we will proceed to:

**Admin Experience & Analytics** (Phase 2-4) - Develop the administrative interface for monitoring student progress and managing enrollments.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
