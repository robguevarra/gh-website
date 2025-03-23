# Graceful Homeschooling Database Schema Documentation

This document provides an overview of the database schema implemented for the Graceful Homeschooling platform using Supabase.

## Database Structure

The database schema is organized into several logical groups:

### User Management
- **profiles**: Extended user information beyond auth.users
- **membership_tiers**: Subscription levels with pricing and features
- **user_memberships**: Many-to-many relationship between users and membership tiers

### Course Content
- **courses**: Main course information (title, description, etc.)
- **modules**: Course sections organized in sequence
- **lessons**: Individual content units within modules
- **tags**: Categories for organizing courses
- **course_tags**: Many-to-many relationship between courses and tags
- **user_progress**: Tracks user progress through lessons
- **user_enrollments**: Tracks user enrollment in courses

### Payment System
- **transactions**: Payment records
- **invoices**: Billing records linked to transactions
- **subscription_payments**: Recurring billing records
- **payment_methods**: Stored payment information
- **discount_codes**: Promotional codes

### Email Marketing
- **email_templates**: Reusable email designs
- **email_campaigns**: Marketing initiatives
- **campaign_recipients**: Email campaign targeting
- **email_automations**: Triggered email sequences
- **user_email_preferences**: User subscription preferences

### Access Control
- **roles**: User role definitions with permissions
- **permissions**: Granular capabilities
- **role_permissions**: Many-to-many relationship between roles and permissions
- **user_roles**: Many-to-many relationship between users and roles
- **access_grants**: Temporary privileges for specific resources

## Row-Level Security (RLS)

Each table has appropriate row-level security policies to ensure data protection:

- Users can only view and edit their own data
- Admins have broader access to manage platform content
- Marketing roles can manage email campaigns
- Instructors can manage course content
- Published content is visible to all users

## Type Definitions

TypeScript type definitions for the database schema are available in `types/supabase.ts`.

## Client Utilities

Database connection utilities are available in `lib/supabase/client.ts`:

- `createServerSupabaseClient()`: For server-side operations using service role key
- `createBrowserSupabaseClient()`: For client-side operations using anon key

## Next Steps

After the database schema implementation, we will proceed to:

1. Implement data access functions for common operations
2. Set up proper error handling
3. Create admin user account and configure initial data
4. Implement authentication system 
5. Test database functionality in the application 

# Supabase Integration

This document outlines the Supabase integration standards and migration considerations for the Graceful Homeschooling platform.

## Overview

The platform uses Supabase for authentication, database, and storage functionality. This guide documents important migration notes and considerations for working with Supabase in a Next.js 15+ environment.

## Important Considerations

### @supabase/auth-helpers is Deprecated

The `@supabase/auth-helpers-nextjs` package is deprecated. We use the newer `@supabase/ssr` package for server-side rendering support with Supabase.

Key migration points:
- Replaced `createServerSupabaseClient` with `createServerClient` from `@supabase/ssr`
- Replaced `createBrowserSupabaseClient` with `createBrowserClient` from `@supabase/ssr`
- Updated cookie handling to work with the new package

### Next.js 15+ Dynamic APIs are Asynchronous

In Next.js 15+, dynamic APIs like `cookies()`, `headers()`, and the `params` and `searchParams` props for pages and layouts are asynchronous.

When working with these APIs:
- You must `await` them or use `React.use()` to unwrap the Promise
- This affects how we integrate Supabase with cookies for server-side auth

Example:
```typescript
// Before (Next.js 14)
export function createClient() {
  const cookieStore = cookies()
  // Use cookieStore directly
}

// After (Next.js 15+)
export async function createClient() {
  const cookieStore = await cookies()
  // Now cookieStore is properly awaited
}
```

## Client Setup

The platform uses a singleton pattern for Supabase client creation:

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

For server-side operations, we use:

```typescript
// lib/supabase/server-client.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

## Authentication Flow

The authentication flow is implemented using the PKCE flow for enhanced security:

1. Client-side authentication is handled through the browser client
2. Server-side session validation uses the server client with cookies
3. Protected routes check for active sessions using middleware

## Database Operations

Database operations should:
1. Use strongly typed clients with generated Supabase types
2. Implement proper error handling
3. Follow consistent patterns for CRUD operations

Example pattern for database operations:
```typescript
// lib/supabase/courses.ts
import { createServerSupabaseClient } from './server-client'

export async function getCourses() {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Error fetching courses:', error)
    throw error
  }
}
```

## Migration Guidelines

When working with code that uses the deprecated `@supabase/auth-helpers-nextjs`:

1. Replace imports:
   ```typescript
   // Old
   import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
   
   // New
   import { createServerClient } from '@supabase/ssr'
   ```

2. Update client creation:
   ```typescript
   // Old
   const supabase = createServerSupabaseClient({ req, res })
   
   // New
   const cookieStore = await cookies()
   const supabase = createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     {
       cookies: {
         get(name) {
           return cookieStore.get(name)?.value
         },
         // ... other cookie methods
       },
     }
   )
   ```

3. Handle async APIs:
   ```typescript
   // Next.js 15+ with dynamic API
   export async function createServerSupabaseClient() {
     const cookieStore = await cookies()
     // rest of the function...
   }
   ```

## Best Practices

1. Always use the typed client with the Database type
2. Implement proper error handling for all Supabase operations
3. Keep authentication logic in dedicated modules
4. Use server components for data fetching when possible
5. Handle loading and error states appropriately
6. Keep sensitive operations server-side 