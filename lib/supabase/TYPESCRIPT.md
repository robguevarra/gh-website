# Graceful Homeschooling Platform: TypeScript Integration

This document covers the TypeScript integration for the Supabase database in the Graceful Homeschooling platform, including all the utility functions, hooks, and authentication functionality.

## Table of Contents

- [Client Utilities](#client-utilities)
- [Data Access Functions](#data-access-functions)
- [React Hooks](#react-hooks)
- [Authentication](#authentication)
- [Admin Utilities](#admin-utilities)
- [Usage Examples](#usage-examples)

## Client Utilities

The platform provides two Supabase clients:

1. **Server-side client** (`createServerSupabaseClient`): For server components and API routes
2. **Browser client** (`createBrowserSupabaseClient`): For client components

```typescript
// Server component example
import { createServerSupabaseClient } from '@/lib/supabase/client';

export default async function ServerComponent() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from('courses').select('*');
  // ...
}
```

```typescript
// Client component example
'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export default function ClientComponent() {
  const supabase = createBrowserSupabaseClient();
  // ...
}
```

## Data Access Functions

Data access functions in `lib/supabase/data-access.ts` provide abstracted methods for common database operations:

### User Profile Functions
- `getUserProfile(userId)`: Get user profile by ID
- `createUserProfile(profile)`: Create a new user profile
- `updateUserProfile(userId, updates)`: Update a user profile

### Course Management Functions
- `getCourses(options)`: Get courses with filtering options
- `getCourseBySlug(slug)`: Get a course by its slug
- `getCourseModules(courseId)`: Get modules for a course
- `getModuleLessons(moduleId)`: Get lessons for a module

### Membership Functions
- `getMembershipTiers()`: Get all membership tiers
- `getUserMembership(userId)`: Get a user's active membership

### Enrollment Functions
- `getUserEnrollments(userId)`: Get courses a user is enrolled in
- `enrollUserInCourse(userId, courseId)`: Enroll a user in a course

### Progress Tracking Functions
- `getUserLessonProgress(userId, lessonId)`: Get a user's progress in a lesson
- `updateUserProgress(userId, lessonId, progress)`: Update a user's lesson progress

All functions use the `withErrorHandling` wrapper for consistent error handling.

## React Hooks

React hooks for client-side data fetching are available in `lib/supabase/hooks.ts`:

### Data Fetching Hooks
- `useSupabaseQuery(queryFn, deps)`: Generic hook for fetching data from Supabase
- `useRealtimeSubscription(table, callback)`: Hook for realtime updates

### Entity-Specific Hooks
- `useUserProfile(userId)`: Get a user's profile
- `useCourses(options)`: Get a filtered list of courses
- `useCourse(slug)`: Get a specific course by slug
- `useUserEnrollments(userId)`: Get a user's course enrollments
- `useUserMembership(userId)`: Get a user's active membership
- `useUserLessonProgress(userId, lessonId)`: Get a user's progress in a lesson
- `useUpdateUserProgress()`: Hook for updating user progress

## Authentication

Authentication functionality is available in `lib/supabase/auth.ts`:

### Authentication Functions
- `signInWithEmail(email, password)`: Sign in with email and password
- `signUpWithEmail(email, password)`: Sign up with email and password
- `signInWithProvider(provider)`: Sign in with a social provider
- `signOut()`: Sign out the current user
- `resetPassword(email)`: Send a password reset email
- `updatePassword(password)`: Update the current user's password
- `getCurrentUser()`: Get the current authenticated user
- `getCurrentSession()`: Get the current session

### Auth Context

An authentication context provider (`context/auth-context.tsx`) is available to manage auth state:

```typescript
'use client';
import { useAuth } from '@/context/auth-context';

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  
  if (!user) {
    return <div>Please sign in</div>;
  }
  
  return (
    <div>
      <h1>Welcome, {profile?.first_name}</h1>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

## Admin Utilities

Admin utilities for setting up and managing the platform:

### Admin User Creation
- `setupAdminUser({ email, password, firstName, lastName })`: Create an admin user

You can run the admin user creation script:

```bash
npm run create-admin
```

## Usage Examples

### Example: Fetching Courses in a Server Component

```typescript
// app/courses/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/client';
import { getCourses } from '@/lib/supabase/data-access';

export default async function CoursesPage() {
  const courses = await getCourses({ publishedOnly: true });
  
  return (
    <div>
      <h1>Available Courses</h1>
      <div className="grid grid-cols-3 gap-4">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
```

### Example: User Dashboard with Client Hooks

```typescript
'use client';
import { useAuth } from '@/context/auth-context';
import { useUserEnrollments } from '@/lib/supabase/hooks';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { data: enrollments, isLoading } = useUserEnrollments(user?.id);
  
  if (!user) {
    return <div>Please sign in</div>;
  }
  
  return (
    <div>
      <h1>Welcome, {profile?.first_name}</h1>
      <h2>Your Courses</h2>
      
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {enrollments?.map(enrollment => (
            <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Example: Authentication Form

```typescript
'use client';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="text-red-500">{error}</div>}
      <div>
        <label>Email</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
      </div>
      <div>
        <label>Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />
      </div>
      <button type="submit">Sign In</button>
    </form>
  );
}
```

## Best Practices

1. Use server components for initial data fetching when possible
2. Use client hooks for interactive components and realtime updates
3. Always provide proper error handling
4. Use the auth context for managing authentication state
5. Check user permissions before displaying sensitive content
6. Follow type safety throughout the application 