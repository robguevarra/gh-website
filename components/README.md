# Components Directory Structure

This document outlines the organization and conventions for the `components` directory in the Graceful Homeschooling platform.

## Overview

The `components` directory follows a domain-driven organization with shared UI components centralized for reuse. Components are organized by domain and follow consistent naming and structure patterns.

## Directory Structure

```
components/
  ├── ui/           # Shared UI components
  ├── admin/        # Admin-specific components
  ├── auth/         # Authentication components
  ├── course/       # Course-related components
  ├── layouts/      # Layout components
  ├── providers/    # Context providers
  └── forms/        # Form components
```

## Component Hierarchy

### Shared vs. Feature-Specific Components

- **Shared components** are placed in the `ui/` directory and are designed for reuse across multiple features
- **Feature-specific components** are placed in domain folders (e.g., `admin/`, `course/`)
- Components should be categorized based on their scope of use and domain relevance

### Component Co-location

- Components that are only used within a specific feature should be co-located with that feature
- Components that are used across multiple features should be in the shared `ui/` directory
- Always consider the component's responsibility and usage scope when deciding its location

## Component File Structure

### Individual Component Files

Each component should be in its own file following these conventions:

- Use PascalCase for component names
- Use kebab-case for file names
- Include type definitions for props
- Export components as named exports
- Keep components focused on a single responsibility
- Maximum 150 lines per file (refactor if exceeded)

Example:
```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
```

### Component Variants and Compositions

- Use composition over inheritance for component variants
- Implement variant patterns using libraries like `class-variance-authority` for consistent styling
- Create compound components when dealing with complex UI elements
- Use the Render Props or Composition patterns for flexible component APIs

Example of a compound component:
```tsx
// components/ui/tabs/index.tsx
import { TabsRoot } from "./tabs-root";
import { TabsList } from "./tabs-list";
import { TabsTrigger } from "./tabs-trigger";
import { TabsContent } from "./tabs-content";

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};

// Usage:
// <Tabs.Root defaultValue="tab1">
//   <Tabs.List>
//     <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
//     <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
//   </Tabs.List>
//   <Tabs.Content value="tab1">Content 1</Tabs.Content>
//   <Tabs.Content value="tab2">Content 2</Tabs.Content>
// </Tabs.Root>
```

## Component Coding Standards

### Server vs. Client Components

- Prefer React Server Components (RSC) by default
- Use the `'use client'` directive only when necessary:
  - Components that use browser-only APIs
  - Components that use React hooks
  - Components that require client-side interactivity

Example:
```tsx
// Server Component (default, no directive needed)
// components/courses/course-list.tsx
import { getCourses } from "@/lib/supabase/courses";

export async function CourseList() {
  const courses = await getCourses();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map(course => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}

// Client Component
// components/ui/theme-toggle.tsx
'use client';

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

### Data Fetching

- Fetch data at the highest possible level in the component tree
- Pass data down to child components via props
- Leverage React Server Components for data fetching where possible
- Use SWR or React Query for client-side data fetching with stale-while-revalidate patterns

### Error Handling

- Implement error boundaries for client components
- Use try/catch blocks for async operations
- Provide meaningful error messages and fallback UIs
- Log errors appropriately for debugging

## Documentation Standards

- Include JSDoc comments for component props
- Document component usage examples in comments
- Explain complex logic and patterns
- Include accessibility considerations

Example:
```tsx
/**
 * A card component that displays course information
 * 
 * @example
 * ```tsx
 * <CourseCard
 *   course={{
 *     id: '123',
 *     title: 'Math Fundamentals',
 *     description: 'Learn the basics of mathematics',
 *     imageUrl: '/images/math.jpg'
 *   }}
 * />
 * ```
 */
export function CourseCard({ course }: { course: Course }) {
  // Component implementation
}
```

## Testing

- Include test files alongside components (e.g., `button.test.tsx` next to `button.tsx`)
- Test component rendering, props handling, and user interactions
- Use testing-library for component testing
- Test accessibility concerns

## Component Library Integration

- Use Shadcn UI components through `npx shadcn@latest add [component]`
- Customize Shadcn UI components to match design system
- Extend component library as needed with custom components
- Maintain consistent API patterns across all components 