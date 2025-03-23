# Coding Patterns and Conventions

This document outlines the coding patterns and conventions for the Graceful Homeschooling platform.

## Overview

Consistent coding patterns and conventions are essential for maintainability, readability, and collaboration. This document establishes standards for component architecture, TypeScript usage, styling, state management, error handling, and more.

## Component Architecture

### Server vs. Client Components

- **Default to React Server Components (RSC)** when possible
- Use the `'use client'` directive only when necessary:
  - When using browser-only APIs
  - When using React hooks
  - For interactive components that need client-side state

Example of a Server Component:
```tsx
// app/courses/page.tsx
import { getCourses } from "@/lib/supabase/courses";
import { CourseCard } from "@/components/courses/course-card";

export default async function CoursesPage() {
  const courses = await getCourses();
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-serif mb-6">Our Courses</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
```

Example of a Client Component:
```tsx
// components/ui/theme-toggle.tsx
'use client';

import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
```

### Data Fetching

- Fetch data at the highest possible level in the component tree
- Use React Server Components for data fetching whenever possible
- For client-side data fetching, use SWR or React Query with proper caching
- Pass data down to child components as props
- Handle loading and error states appropriately

Server-side data fetching:
```tsx
// app/courses/[courseId]/page.tsx
import { getCourse } from "@/lib/supabase/courses";
import { CourseDetails } from "@/components/courses/course-details";
import { notFound } from "next/navigation";

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  try {
    const course = await getCourse(params.courseId);
    
    if (!course) {
      notFound();
    }
    
    return <CourseDetails course={course} />;
  } catch (error) {
    console.error("Error fetching course:", error);
    throw new Error("Failed to load course");
  }
}
```

Client-side data fetching:
```tsx
// components/courses/course-enrollment.tsx
'use client';

import useSWR from "swr";
import { EnrollButton } from "@/components/courses/enroll-button";

interface CourseEnrollmentProps {
  courseId: string;
}

export function CourseEnrollment({ courseId }: CourseEnrollmentProps) {
  const { data, error, isLoading } = useSWR(
    `/api/v1/courses/${courseId}/enrollment`,
    fetcher
  );
  
  if (isLoading) return <div>Checking enrollment status...</div>;
  if (error) return <div>Failed to load enrollment status</div>;
  
  return (
    <div>
      {data.isEnrolled ? (
        <div>You are enrolled in this course</div>
      ) : (
        <EnrollButton courseId={courseId} />
      )}
    </div>
  );
}
```

### Component Composition

- Use composition over inheritance
- Break down complex components into smaller, reusable pieces
- Use the children prop for flexible component APIs
- Implement compound components for complex UI elements

Example of component composition:
```tsx
// components/ui/card.tsx
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
}

// Usage:
// <Card>
//   <CardHeader>
//     <h3 className="text-xl font-semibold">Card Title</h3>
//   </CardHeader>
//   <div className="p-6">Card content...</div>
// </Card>
```

### Error Handling

- Use error boundaries for client components
- Implement clear error states in the UI
- Handle both expected and unexpected errors
- Log errors appropriately for debugging

Example error boundary:
```tsx
// components/error-boundary.tsx
'use client';

import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary fallback={fallback}>
      {children}
    </ReactErrorBoundary>
  );
}

// Usage:
// <ErrorBoundary fallback={<div>Something went wrong</div>}>
//   <ComponentThatMightError />
// </ErrorBoundary>
```

## TypeScript Usage

### Type Definitions

- Use TypeScript for all files (`.tsx`, `.ts`)
- Create explicit interfaces and types for components props
- Use generics when appropriate for reusable components
- Avoid using `any` type - use `unknown` if type is truly unknown

Example:
```tsx
// components/courses/course-card.tsx
import Image from "next/image";
import Link from "next/link";
import { Course } from "@/types";

interface CourseCardProps {
  course: Course;
  showEnrollButton?: boolean;
}

export function CourseCard({ course, showEnrollButton = false }: CourseCardProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {course.imageUrl && (
        <div className="aspect-video relative">
          <Image
            src={course.imageUrl}
            alt={course.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold">{course.title}</h3>
        <p className="text-muted-foreground line-clamp-2">{course.description}</p>
        <div className="mt-4">
          <Link
            href={`/courses/${course.id}`}
            className="text-primary font-medium hover:underline"
          >
            View Course
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Type Organization

- Define types close to where they're used
- Create dedicated type files for shared types
- Use barrel exports for related types
- Keep type definitions clean and focused

Example type file:
```typescript
// types/course.ts
export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  price?: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseLesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  order: number;
  videoUrl?: string;
}

export interface CourseEnrollment {
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string;
}
```

### Utility Types

- Use TypeScript utility types for type transformations
- Create custom utility types for repeated patterns
- Be explicit about nullable and optional types

Example:
```typescript
// types/utils.ts
import { Course } from "./course";

// Omit id and timestamps for course creation
export type CourseCreateInput = Omit<Course, 'id' | 'createdAt' | 'updatedAt'>;

// Only certain fields can be updated
export type CourseUpdateInput = Partial<Pick<Course, 'title' | 'description' | 'imageUrl' | 'price' | 'published'>>;

// Generic API response type
export type ApiResponse<T> = {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
};
```

## Styling Conventions

### TailwindCSS Usage

- Use TailwindCSS utility classes for styling
- Group related classes logically
- Extract repeated class combinations to component-level variables
- Use appropriate responsive prefixes for different screen sizes

Example:
```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";

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
```

### Design System

- Follow the established color system and typography
- Use the design tokens defined in `tailwind.config.ts`
- Maintain consistent spacing, rounding, and shadows
- Adapt designs for different screen sizes using responsive classes

Example consistency:
```tsx
// Good: Using design tokens
<div className="bg-background text-foreground p-4 rounded-lg border border-border">
  <h3 className="text-xl font-serif mb-2">Heading</h3>
  <p className="text-muted-foreground">Content text here</p>
</div>

// Avoid: Using arbitrary values
<div className="bg-white text-black p-[17px] rounded-[6px] border-[#e5e5e5]">
  <h3 className="text-[20px] font-serif mb-[10px]">Heading</h3>
  <p className="text-[#666666]">Content text here</p>
</div>
```

### Responsive Design

- Follow mobile-first approach
- Use responsive breakpoints consistently
- Test layouts at different screen sizes
- Ensure touch targets are appropriately sized on mobile

Example responsive layout:
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => (
    <div key={item.id} className="p-4 border rounded-lg">
      <h3 className="text-lg md:text-xl">{item.title}</h3>
      <p className="mt-2 text-sm md:text-base">{item.description}</p>
    </div>
  ))}
</div>
```

## State Management

### Local Component State

- Use `useState` for simple component state
- Use `useReducer` for complex state logic
- Keep state as close as possible to where it's used

Example:
```tsx
// components/courses/course-filter.tsx
'use client';

import { useState } from "react";
import { Select } from "@/components/ui/select";

interface CourseFilterProps {
  onFilterChange: (filters: CourseFilters) => void;
}

interface CourseFilters {
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  sort?: 'newest' | 'popular';
}

export function CourseFilter({ onFilterChange }: CourseFilterProps) {
  const [filters, setFilters] = useState<CourseFilters>({});
  
  const handleCategoryChange = (category: string) => {
    const newFilters = { ...filters, category };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  // Additional handlers...
  
  return (
    <div className="space-y-4">
      <Select
        label="Category"
        value={filters.category}
        onChange={handleCategoryChange}
        options={[
          { label: "All Categories", value: "" },
          { label: "Mathematics", value: "math" },
          { label: "Science", value: "science" },
          // More options...
        ]}
      />
      {/* More filter controls... */}
    </div>
  );
}
```

### Global State Management

- Use Zustand for global state management
- Create focused stores for specific domains
- Separate UI state from data state
- Keep store implementations simple and testable

Example Zustand store:
```typescript
// lib/stores/use-course-store.ts
import { create } from 'zustand';
import { getCourses } from '@/lib/supabase/courses';
import type { Course } from '@/types';

interface CourseState {
  courses: Course[];
  isLoading: boolean;
  error: string | null;
  fetchCourses: () => Promise<void>;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  isLoading: false,
  error: null,
  fetchCourses: async () => {
    try {
      set({ isLoading: true, error: null });
      const courses = await getCourses();
      set({ courses, isLoading: false });
    } catch (error) {
      console.error('Error fetching courses:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch courses',
        isLoading: false
      });
    }
  },
}));
```

## Function Organization

### Pure Functions

- Create pure functions whenever possible
- Keep functions small and focused
- Use descriptive names with auxiliary verbs
- Include proper type definitions

Example:
```typescript
// lib/utils/string-utils.ts

/**
 * Truncate a string to a specified length and add ellipsis if needed
 * @param str - String to truncate
 * @param length - Maximum length
 * @returns Truncated string
 */
export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Convert a string to title case
 * @param str - String to convert
 * @returns Title-cased string
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

### Async Operations

- Use async/await for asynchronous code
- Implement proper error handling for all async operations
- Provide meaningful error messages
- Add proper TypeScript types for async functions

Example:
```typescript
// lib/supabase/auth.ts
import { supabase } from './client';

interface SignInParams {
  email: string;
  password: string;
}

export async function signIn({ email, password }: SignInParams) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}
```

## Naming Conventions

### Variables and Functions

- Use camelCase for variables and functions
- Use PascalCase for component names and types
- Include auxiliary verbs for boolean variables
- Use descriptive, semantic names

Examples:
```typescript
// Good variable naming
const isLoading = true;
const hasError = false;
const courseList = [...];
const fetchUserProfile = async () => { ... };

// Avoid
const loading = true; // Missing auxiliary verb
const error = false; // Unclear what this means
const courses = [...]; // Less specific
const getUser = async () => { ... }; // Vague action
```

### Files and Directories

- Use kebab-case for file and directory names
- Group related files in descriptive directories
- Use consistent naming patterns across similar files
- Keep filenames concise but descriptive

Examples:
```
components/courses/course-card.tsx    // Good: specific and follows pattern
components/courses/card.tsx           // Bad: too generic
components/CourseCard.tsx             // Bad: wrong case style
components/really-long-course-card-component-with-enrollment.tsx  // Bad: too long
```

### Constants

- Use UPPER_SNAKE_CASE for constants
- Group related constants in descriptive objects
- Export constants from dedicated files

Example:
```typescript
// lib/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  COURSES: '/courses',
  ADMIN: {
    DASHBOARD: '/admin',
    COURSES: '/admin/courses',
    USERS: '/admin/users',
  },
};

// lib/constants/api.ts
export const API = {
  BASE_URL: '/api/v1',
  ENDPOINTS: {
    COURSES: '/courses',
    USERS: '/users',
    AUTH: '/auth',
  },
};
```

## Testing Standards

### Component Testing

- Test components for rendering, props handling, and user interactions
- Use React Testing Library for component tests
- Focus on testing behavior, not implementation details
- Include accessibility testing

Example component test:
```tsx
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
  
  it('applies variant and size classes', () => {
    render(<Button variant="outline" size="sm">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('rounded-md');
  });
  
  it('handles clicks correctly', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Utility Testing

- Write unit tests for utility functions
- Focus on edge cases and error handling
- Keep tests small and focused
- Use descriptive test names

Example utility test:
```typescript
// lib/utils/string-utils.test.ts
import { truncateString, toTitleCase } from './string-utils';

describe('truncateString', () => {
  it('returns original string if shorter than max length', () => {
    expect(truncateString('hello', 10)).toBe('hello');
  });
  
  it('truncates string and adds ellipsis if longer than max length', () => {
    expect(truncateString('hello world', 5)).toBe('hello...');
  });
  
  it('handles empty string', () => {
    expect(truncateString('', 10)).toBe('');
  });
});

describe('toTitleCase', () => {
  it('converts string to title case', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
  });
  
  it('handles already capitalized words', () => {
    expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
  });
  
  it('handles empty string', () => {
    expect(toTitleCase('')).toBe('');
  });
});
```

## Documentation

### Code Comments

- Comment complex logic that isn't self-explanatory
- Document public APIs with JSDoc comments
- Avoid commenting obvious code
- Keep comments up to date with code changes

Example:
```typescript
/**
 * Calculate the price with applicable discounts
 * @param price - Base price
 * @param discountPercent - Discount percentage (0-100)
 * @param couponCode - Optional coupon code for additional discount
 * @returns Final price after discounts
 */
export function calculateDiscountedPrice(
  price: number,
  discountPercent: number,
  couponCode?: string
): number {
  // Apply percentage discount
  let finalPrice = price * (1 - discountPercent / 100);
  
  // Apply coupon discount if provided
  if (couponCode) {
    const couponDiscount = getCouponDiscount(couponCode, finalPrice);
    finalPrice -= couponDiscount;
  }
  
  // Ensure price doesn't go below zero
  return Math.max(0, finalPrice);
}
```

### Component Documentation

- Document component props with JSDoc comments
- Include usage examples for complex components
- Document component variants and options
- Note any performance considerations

Example:
```tsx
/**
 * DataTable component for displaying tabular data with sorting, filtering, and pagination
 * 
 * @example
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={userData}
 *   pagination={true}
 *   searchable={true}
 * />
 * ```
 */
export function DataTable<T>({
  columns,
  data,
  pagination = true,
  searchable = false,
  initialSortColumn,
  onRowClick,
}: DataTableProps<T>) {
  // Component implementation
}
```

## Code Review Guidelines

- Check for adherence to coding standards
- Verify proper error handling
- Review performance implications
- Ensure accessibility standards are met
- Test on different devices and browsers
- Look for clear, maintainable code

## Accessibility Standards

- Use semantic HTML elements
- Include proper ARIA attributes when needed
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Support screen readers
- Test with accessibility tools

Example:
```tsx
// Good accessibility
<button
  aria-label="Close dialog"
  onClick={closeDialog}
  className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
>
  <span className="sr-only">Close</span>
  <XIcon className="h-5 w-5" aria-hidden="true" />
</button>

// Poor accessibility
<div
  onClick={closeDialog}
  className="p-2 cursor-pointer"
>
  <XIcon className="h-5 w-5" />
</div>
```

---

This document serves as a guide for all developers working on the Graceful Homeschooling platform. Following these conventions ensures consistency, maintainability, and quality across the codebase.

Last updated: March 23, 2024 