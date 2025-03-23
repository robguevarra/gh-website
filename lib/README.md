# Utilities and Helpers Organization

This document outlines the organization and conventions for utilities and helpers in the Graceful Homeschooling platform.

## Overview

The `lib` directory contains utility functions, service modules, and helper code that support the application's functionality. These utilities are organized by domain and purpose to ensure maintainability and reusability.

## Directory Structure

```
lib/
  ├── supabase/         # Supabase client and database operations
  │   ├── client.ts     # Supabase client initialization
  │   ├── courses.ts    # Course-related database operations
  │   ├── users.ts      # User-related database operations
  │   └── auth.ts       # Authentication helpers
  ├── hooks/            # Custom React hooks
  │   ├── use-debounce.ts
  │   ├── use-media-query.ts
  │   └── use-form.ts
  ├── utils/            # General utility functions
  │   ├── date-utils.ts
  │   ├── string-utils.ts
  │   └── array-utils.ts
  ├── validators/       # Form and data validators
  │   ├── course-validators.ts
  │   ├── user-validators.ts
  │   └── common-validators.ts
  ├── constants/        # Application constants
  │   ├── routes.ts
  │   ├── config.ts
  │   └── features.ts
  ├── services/         # External service integrations
  │   ├── stripe.ts
  │   ├── email.ts
  │   └── analytics.ts
  ├── providers/        # Provider utilities
  │   ├── theme-provider.ts
  │   └── auth-provider.ts
  └── types/            # Shared type definitions
      ├── common.ts
      └── api.ts
```

## Organization Guidelines

### Domain-Specific vs. Shared Utilities

- **Domain-Specific Utilities**: Functions or modules specific to a particular feature or domain
  - Located in domain-named directories (e.g., `supabase/courses.ts`)
  - Focus on operations relevant to that domain
  
- **Shared Utilities**: Generic functions used across multiple domains
  - Located in general directories (e.g., `utils/date-utils.ts`)
  - Focus on reusable operations that aren't tied to a specific domain

### File Organization

- Each file should focus on a single concern or group of related functionality
- Keep files small and focused (maximum of 150 lines)
- Use clear, descriptive file names that indicate purpose
- Group related utilities into appropriate subdirectories

## Coding Patterns

### Utility Function Structure

- Use named exports for utility functions
- Focus on pure functions when possible (same input → same output)
- Include TypeScript types for parameters and return values
- Keep functions small and focused (single responsibility)

Example:
```typescript
// lib/utils/date-utils.ts
import { format, parseISO, differenceInDays } from 'date-fns';

/**
 * Format a date string into a human-readable format
 * @param dateStr - ISO date string to format
 * @param formatStr - date-fns format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDate(dateStr: string, formatStr = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateStr), formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Calculate days remaining until a target date
 * @param targetDate - Target date as ISO string
 * @returns Number of days remaining (negative if past)
 */
export function daysRemaining(targetDate: string): number {
  try {
    const target = parseISO(targetDate);
    const today = new Date();
    return differenceInDays(target, today);
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return 0;
  }
}
```

### Service Module Structure

Service modules integrate with external services or provide domain-specific functionality.

Example:
```typescript
// lib/services/email.ts
import { createTransport } from 'nodemailer';
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/welcome-email';

/**
 * Email service for sending transactional emails
 */
export class EmailService {
  private transporter;
  
  constructor() {
    this.transporter = createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  /**
   * Send a welcome email to a new user
   * @param params - Email parameters
   * @returns Promise resolving to the send result
   */
  async sendWelcomeEmail({ to, name }: { to: string; name: string }) {
    const html = render(WelcomeEmail({ name }));
    
    return this.transporter.sendMail({
      from: `"Graceful Homeschooling" <${process.env.EMAIL_FROM}>`,
      to,
      subject: 'Welcome to Graceful Homeschooling',
      html
    });
  }
  
  // Additional email methods...
}

// Export a singleton instance
export const emailService = new EmailService();
```

### Custom React Hooks

React hooks should be organized in the `hooks` directory.

Example:
```typescript
// lib/hooks/use-debounce.ts
import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
```

### TypeScript Types

Types should be well-defined and appropriately exported:

```typescript
// lib/types/common.ts
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
```

## Database Utility Patterns

The `supabase` directory contains utilities for database operations:

Example:
```typescript
// lib/supabase/courses.ts
import { supabase } from './client';
import { PaginationParams, PaginatedResponse } from '../types/common';
import { Course } from '@/types';

/**
 * Fetch courses with pagination
 * @param params - Pagination parameters
 * @returns Promise with courses data and count
 */
export async function getCourses({ 
  page = 1, 
  limit = 10 
}: PaginationParams): Promise<PaginatedResponse<Course>> {
  const offset = (page - 1) * limit;
  
  // Get courses
  const { data, error, count } = await supabase
    .from('courses')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
    
  if (error) {
    console.error('Error fetching courses:', error);
    throw new Error('Failed to fetch courses');
  }
  
  return {
    data: data || [],
    meta: {
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit)
    }
  };
}

/**
 * Get a single course by ID
 * @param id - Course ID
 * @returns Promise with course data
 */
export async function getCourse(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    console.error(`Error fetching course ${id}:`, error);
    throw new Error('Failed to fetch course');
  }
  
  return data;
}

/**
 * Create a new course
 * @param course - Course data
 * @returns Promise with created course
 */
export async function createCourse(course: Omit<Course, 'id'>): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating course:', error);
    throw new Error('Failed to create course');
  }
  
  return data;
}

/**
 * Update an existing course
 * @param id - Course ID
 * @param updates - Course updates
 * @returns Promise with updated course
 */
export async function updateCourse(
  id: string, 
  updates: Partial<Omit<Course, 'id'>>
): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error(`Error updating course ${id}:`, error);
    throw new Error('Failed to update course');
  }
  
  return data;
}

/**
 * Delete a course
 * @param id - Course ID
 * @returns Promise<void>
 */
export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error(`Error deleting course ${id}:`, error);
    throw new Error('Failed to delete course');
  }
}
```

## Validation Patterns

Validation utilities are organized in the `validators` directory:

```typescript
// lib/validators/course-validators.ts
import { z } from 'zod';

export const courseSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  price: z.number()
    .min(0, 'Price cannot be negative')
    .optional(),
  imageUrl: z.string()
    .url('Invalid image URL')
    .optional(),
  published: z.boolean().default(false)
});

export type CourseFormValues = z.infer<typeof courseSchema>;

export function validateCourseData(data: unknown) {
  return courseSchema.safeParse(data);
}
```

## Constants and Configuration

Constants and configuration values are organized in the `constants` directory:

```typescript
// lib/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  COURSES: '/courses',
  COURSE_DETAIL: (courseId: string) => `/courses/${courseId}`,
  ADMIN: {
    DASHBOARD: '/admin',
    COURSES: '/admin/courses',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings'
  },
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    RESET_PASSWORD: '/auth/reset-password'
  }
};
```

## Documentation Standards

- Use JSDoc comments for functions, classes, and modules
- Include types for parameters and return values
- Provide examples for complex utilities
- Explain the purpose and usage of each module

Example:
```typescript
/**
 * Paginate an array of items
 * 
 * @param items - Array of items to paginate
 * @param page - Current page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Object containing paginated items and metadata
 * 
 * @example
 * ```ts
 * const { data, meta } = paginateArray([1, 2, 3, 4, 5], 1, 2);
 * // data: [1, 2], meta: { total: 5, page: 1, pageSize: 2, pages: 3 }
 * ```
 */
export function paginateArray<T>(
  items: T[], 
  page: number = 1, 
  pageSize: number = 10
): PaginatedResponse<T> {
  // Implementation
}
```

## Testing

- Include tests for utility functions
- Focus on testing edge cases and error handling
- Keep test files alongside utility files or in a parallel test directory
- Ensure high test coverage for critical utilities 