# App Directory Structure

This document outlines the organization and conventions for the `app` directory in the Graceful Homeschooling platform.

## Overview

The `app` directory follows Next.js App Router conventions and implements a domain-driven folder structure. Each domain has its own folder with related pages, layouts, and components.

## Route Organization

### Page Routes

- Each route is defined with a `page.tsx` file
- Route segments correspond to URL paths
- Pages should be kept minimal, importing components for actual UI
- Server components are preferred for pages whenever possible

Example:
```tsx
// app/courses/page.tsx
import { CoursesList } from "@/components/courses/courses-list";

export default function CoursesPage() {
  return (
    <main className="container py-10">
      <h1 className="mb-6 text-3xl font-serif">Available Courses</h1>
      <CoursesList />
    </main>
  );
}
```

### Layout Structure

- Each section should have its own `layout.tsx` when layout differs from parent
- Layouts should be used for persistent UI elements (navigation, sidebars)
- Use nested layouts to avoid duplication
- Keep layouts simple and focused on structure

Example:
```tsx
// app/admin/layout.tsx
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="grid grid-cols-[250px_1fr] min-h-screen">
      <AdminSidebar />
      <main className="p-6">{children}</main>
    </div>
  );
}
```

### Route Groups

- Route groups (folders in parentheses) organize related routes without affecting URL structure
- Use route groups for:
  - Organizing routes by section: `(marketing)`, `(app)`, `(auth)`
  - Sharing layouts: All routes in a group can share a layout
  - Separating application sections logically

Example structure:
```
app/
  (auth)/           # Authentication routes with shared layout
    login/
    signup/
    reset-password/
    layout.tsx      # Shared auth layout
  (marketing)/      # Public-facing pages with shared layout
    about/
    contact/
    layout.tsx      # Marketing section layout
```

### Dynamic Routes

- Dynamic segments use square brackets: `[id]`, `[slug]`
- Catch-all routes use ellipsis: `[...slug]`
- Optional catch-all routes use double ellipsis: `[[...slug]]`
- Keep dynamic route parameters meaningful and consistent

Example:
```
app/
  courses/
    [courseId]/           # Dynamic course page
      page.tsx            # /courses/123
      lessons/
        [lessonId]/       # Dynamic lesson page
          page.tsx        # /courses/123/lessons/456
```

## Loading States & Error Handling

- Each route can have `loading.tsx` for loading UI
- Each route can have `error.tsx` for error boundaries
- Implement `not-found.tsx` for 404 handling

Example:
```tsx
// app/courses/[courseId]/loading.tsx
export default function CourseLoading() {
  return <div className="animate-pulse">Loading course content...</div>;
}
```

## Parallel Routes & Intercepting Routes

- Parallel routes use `@folder` naming convention for displaying multiple pages simultaneously
- Intercepting routes use `(.)folder` or `(..)folder` or `(...)folder` naming for modal patterns

Example:
```
app/
  dashboard/
    page.tsx            # Main dashboard view
    @stats/             # Parallel route for stats
      page.tsx
    @notifications/     # Parallel route for notifications
      page.tsx
```

## API Routes

API routes are placed in the `api` directory:

```
app/
  api/
    courses/
      route.ts         # GET/POST /api/courses
      [id]/
        route.ts       # GET/PUT/DELETE /api/courses/123
```

## File Naming Conventions

- All files use kebab-case: `user-profile.tsx`
- Special Next.js files follow framework conventions: `page.tsx`, `layout.tsx`, `loading.tsx`
- Files should have logical, descriptive names that indicate their purpose

## Metadata

- Use the Metadata API for SEO and social sharing:
  - `metadata.ts` exports for static metadata
  - `generateMetadata` functions for dynamic metadata

Example:
```tsx
// app/courses/[courseId]/page.tsx
export async function generateMetadata({ params }) {
  const course = await getCourse(params.courseId);
  
  return {
    title: `${course.title} | Graceful Homeschooling`,
    description: course.description,
  };
}
```

## Performance Considerations

- Keep route segment code minimal
- Leverage React Server Components for data fetching
- Use streaming and suspense patterns for progressive rendering
- Implement appropriate caching strategies for data fetching 