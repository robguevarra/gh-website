# Supabase Integration Guide

## Overview
This document provides guidance on how Supabase is integrated within the Graceful Homeschooling platform, with specific focus on authentication patterns, database access, and Row Level Security (RLS) policies. It serves as a reference for developers to understand the established patterns and best practices.

## Important Migration Notes

### @Supabase Deprecated: Auth Helpers to SSR

The `@supabase/auth-helpers-nextjs` package is deprecated and has been replaced with `@supabase/ssr`. All code should use the newer package with updated client creation methods:

| Deprecated (auth-helpers) | Current (ssr) |
|---------------------------|---------------|
| `createServerSupabaseClient` | `createServerClient` |
| `createBrowserSupabaseClient` | `createBrowserClient` |
| `createRouteHandlerSupabaseClient` | `createRouteHandlerClient` |

When migrating code:
1. Update imports from `@supabase/auth-helpers-nextjs` to `@supabase/ssr`
2. Replace client creation methods with their updated equivalents
3. Update cookie handling to match the new API

### @Dynamic APIs: Next.js 15+ Changes

In Next.js 15+, the following dynamic APIs are now asynchronous:
- `cookies()`
- `headers()`
- `params` and `searchParams` props

This directly affects Supabase authentication which relies on cookie access:

```typescript
// BEFORE (Next.js 14)
const cookieStore = cookies();
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { ... } }
);

// AFTER (Next.js 15+)
const cookieStore = await cookies();
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { ... } }
);
```

All server components, API routes, and middleware that use these APIs must be updated to properly await the results.

## Authentication & Client Implementation

### Client Types

1. **Browser Client (`createBrowserSupabaseClient`)**
   - Purpose: For client-side authentication and data access in browser components
   - Location: `lib/supabase/client.ts`
   - Usage: For user-facing components that require authentication or data fetching
   - Limitations: Subject to RLS policies, no admin privileges

2. **Server Component Client (`createServerSupabaseClient`)**
   - Purpose: For server components that need to access user session data
   - Location: `lib/supabase/server.ts`
   - Usage: For server components that render based on user authentication status
   - Limitations: Subject to RLS policies, requires cookie handling

3. **Route Handler Client (`createRouteHandlerClient`)**
   - Purpose: For API routes to verify authentication status
   - Location: `lib/supabase/route-handler.ts`
   - Usage: For API routes that need to check user authentication
   - Limitations: Subject to RLS policies, requires cookie handling

4. **Service Role Client (`createServiceRoleClient`)**
   - Purpose: For admin operations that need to bypass RLS
   - Location: `lib/supabase/server.ts`
   - Usage: For admin routes and operations that need unrestricted database access
   - Important: Does not use cookie-based auth to prevent RLS conflicts

### Authentication Best Practices

1. **Always Await Client Creation**
   ```typescript
   // CORRECT
   const supabase = await createServerSupabaseClient();
   const { data } = await supabase.from("table").select("*");
   
   // INCORRECT - will cause "supabase.from is not a function" errors
   const supabase = createServerSupabaseClient();
   const { data } = await supabase.from("table").select("*");
   ```

2. **Use Service Role Client for Admin Operations**
   ```typescript
   // For admin operations, always use service role client
   const adminClient = await createServiceRoleClient();
   const { data } = await adminClient.from("table").select("*");
   ```

3. **Verify Admin Status with Service Role Client**
   ```typescript
   // ✅ CORRECT: Use service role client for admin verification to bypass RLS
   const adminClient = await createServiceRoleClient();
   const { data: profile } = await adminClient
     .from("profiles")
     .select("role, is_admin")
     .eq("id", user.id)
     .single();
   
   // ❌ INCORRECT: Using regular client can lead to permission errors
   const { data: profile } = await supabase
     .from("profiles")
     .select("role")
     .eq("id", user.id)
     .single();
   ```

4. **Handle Authentication Errors Gracefully**
   ```typescript
   try {
     const supabase = await createRouteHandlerClient();
     const { data: { user } } = await supabase.auth.getUser();
     
     if (!user) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }
     
     // Continue with authenticated logic...
   } catch (error) {
     console.error("Authentication error:", error);
     return NextResponse.json(
       { error: "Authentication error" },
       { status: 500 }
     );
   }
   ```

## Database Access Patterns

### Data Fetching Hooks

The platform includes custom hooks for data fetching to ensure consistent patterns:

1. **`useSupabaseQuery`**: For general data fetching from Supabase
2. **`useUserProfile`**: For fetching the current user's profile
3. **`useCourses`**: For fetching course data with filtering options
4. **`useUserEnrollments`**: For fetching user enrollment data
5. **`useUserMembership`**: For fetching user membership data

Example usage:
```typescript
const { data: profile, error, isLoading } = useUserProfile(user?.id);

// With filtering options
const { data: courses } = useCourses({ 
  featured: true, 
  publishedOnly: true 
});
```

### Server Component Data Fetching

For server components, use the following pattern:

```typescript
// In a server component
export default async function Component() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Fetch data
    const { data, error } = await supabase
      .from("table")
      .select("*");
      
    if (error) throw error;
    
    // Render component with data
    return <div>{/* Component JSX */}</div>;
  } catch (error) {
    console.error("Error:", error);
    return <ErrorComponent />;
  }
}
```

### Admin Data Access

For admin operations that bypass RLS:

```typescript
export async function AdminComponent() {
  try {
    // Use service role client for admin operations
    const adminClient = await createServiceRoleClient();
    
    // Fetch data, bypassing RLS
    const { data, error } = await adminClient
      .from("table")
      .select("*");
      
    if (error) throw error;
    
    // Render admin component
    return <div>{/* Admin Component JSX */}</div>;
  } catch (error) {
    console.error("Admin error:", error);
    return <AdminErrorComponent />;
  }
}
```

## Schema Management

### Key Tables and Relationships

1. **Users & Profiles**
   - `auth.users`: Managed by Supabase Auth
   - `public.profiles`: Extended user information, linked to auth.users

2. **Courses & Content**
   - `public.courses`: Course metadata and information
   - `public.modules`: Course modules, linked to courses
   - `public.lessons`: Lesson content, linked to modules

3. **User Progress & Enrollment**
   - `public.user_enrollments`: Links users to courses
   - `public.user_progress`: Tracks lesson completion

4. **Membership & Access**
   - `public.membership_tiers`: Available membership levels
   - `public.user_memberships`: Links users to membership tiers

### Schema Best Practices

1. **Always Define Default Values**
   ```sql
   -- Example: Status column with default value
   ALTER TABLE public.lessons ADD COLUMN status text NOT NULL DEFAULT 'draft';
   ```

2. **Use Consistent Timestamps**
   ```sql
   -- Always include created_at and updated_at
   created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   ```

3. **Validate Schema Before UI Implementation**
   - Ensure all required columns exist in the database before implementing UI features
   - When UI references a non-existent column (e.g., `lesson.status`), add it to the schema

## Row Level Security (RLS) Policies

### Standard RLS Patterns

1. **Profiles Table**
   - Users can read their own profile
   - Users can update their own profile
   - Admins can read and write all profiles

2. **Courses Table**
   - Published courses are readable by all authenticated users
   - Draft courses are only readable by admins
   - Only admins can create, update, or delete courses

3. **Lessons & Modules**
   - Access controlled through course enrollment and membership tier
   - Admin bypass for all operations

### Handling RLS in Admin Routes

For admin routes that need to bypass RLS:

1. Use the service role client for ALL database operations
2. Verify admin status using the service role client
3. Implement try/catch blocks for proper error handling

## Troubleshooting Common Issues

### "Permission denied for table X"
- Indicates an RLS policy is blocking access
- Solution: Use service role client for admin operations

### "Supabase.from is not a function"
- Indicates the client was not properly awaited
- Solution: Always await client creation with `await createXClient()`

### "Could not find column X in table Y"
- Indicates a missing column in the database schema
- Solution: Add the column to the database with appropriate defaults

### Authentication Issues
- Check cookie handling in route handlers
- Verify the correct client is being used (browser vs. server vs. service role)
- Implement proper error handling with try/catch blocks

## Future Considerations

1. **Migration to Edge Runtime**
   - Consider moving API routes to Edge Runtime for better performance
   - Requires adapting cookie handling for Edge compatibility

2. **Enhanced Realtime Subscriptions**
   - Expand use of Supabase realtime features for collaborative features
   - Implement proper clean-up of channels in useEffect returns

3. **Improved Error Handling**
   - Standardize error responses across all API routes
   - Implement more detailed error logging for debugging

4. **Performance Optimization**
   - Use targeted selects instead of selecting "*"
   - Implement pagination for large data sets
   - Consider caching strategies for frequently accessed data 