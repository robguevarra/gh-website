# Graceful Homeschooling Error Handling & Logging Standards

This document outlines the standards and best practices for error handling and logging in the Graceful Homeschooling platform to ensure consistent error management, improved debugging, and better user experience.

## Table of Contents

1. [Error Handling Principles](#error-handling-principles)
2. [Client-Side Error Handling](#client-side-error-handling)
3. [Server-Side Error Management](#server-side-error-management)
4. [Error Reporting](#error-reporting)
5. [Logging Standards](#logging-standards)
6. [Monitoring Approach](#monitoring-approach)
7. [Implementation Examples](#implementation-examples)

## Error Handling Principles

### Core Principles

1. **User-Friendly Messages**: Display helpful, non-technical error messages to users
2. **Detailed Internal Logging**: Log detailed error information for debugging purposes
3. **Consistent Error Structure**: Use consistent error objects and handling patterns
4. **Graceful Degradation**: Prevent cascading failures when errors occur
5. **Recovery Mechanisms**: Provide options for users to recover from errors when possible

### Error Severity Levels

- **Critical**: Application crash, data loss, security breach
- **Error**: Feature failure, but application continues to function
- **Warning**: Potential issues that don't immediately affect functionality
- **Info**: Informational messages about unusual but non-problematic events

## Client-Side Error Handling

### React Error Boundaries

Use Error Boundary components to catch and handle rendering errors:

```tsx
// components/error-boundary.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to monitoring service
    console.error('React Error Boundary caught an error:', error, errorInfo);
    // logErrorToService(error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="p-6 rounded-lg bg-red-50 border border-red-200">
          <h2 className="text-lg font-medium text-red-800">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-700">
            We encountered an unexpected error. Please try again or contact support if the issue persists.
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4"
            variant="outline"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Form Error Handling

Use Zod validation with React Hook Form for consistent form error handling:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define schema with validation messages
const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  // Initialize form with schema
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setServerError(null);
      // API call
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      // Handle successful login
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </Form>
  );
}
```

### API Request Error Handling

Use a consistent pattern for handling API fetch errors:

```tsx
// lib/utils/api-utils.ts
export class ApiError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function fetchWithErrorHandling<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    // If it's already an ApiError, rethrow it
    if (error instanceof ApiError) {
      throw error;
    }
    
    // For network errors or other non-HTTP errors
    if (error instanceof Error) {
      console.error(`API request error: ${error.message}`);
      throw new ApiError(
        'Network error or service unavailable. Please check your connection and try again.',
        0
      );
    }
    
    // For unknown errors
    throw new ApiError('An unexpected error occurred', 0);
  }
}
```

### Creating Custom Hooks for Error Handling

Create reusable hooks for common error handling patterns:

```tsx
// lib/hooks/use-async.ts
import { useState, useCallback } from 'react';

interface AsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const run = useCallback(async (promise: Promise<T>) => {
    setState({ status: 'pending', data: null, error: null });
    try {
      const data = await promise;
      setState({ status: 'success', data, error: null });
      return data;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState({ status: 'error', data: null, error: errorObj });
      throw errorObj;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, []);

  return {
    isIdle: state.status === 'idle',
    isLoading: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    data: state.data,
    error: state.error,
    run,
    reset,
  };
}
```

## Server-Side Error Management

### API Route Error Handling

Use consistent error handling in API routes:

```tsx
// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate params
    if (!params.id) {
      logger.warn('Course ID not provided in request');
      return NextResponse.json(
        { error: 'Course ID is required' }, 
        { status: 400 }
      );
    }

    // Database operation
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', params.id)
      .single();

    // Handle database errors
    if (error) {
      logger.error('Database error fetching course', {
        error: error.message,
        courseId: params.id
      });
      
      return NextResponse.json(
        { error: 'Failed to fetch course' }, 
        { status: 500 }
      );
    }

    // Handle not found
    if (!data) {
      logger.info('Course not found', { courseId: params.id });
      return NextResponse.json(
        { error: 'Course not found' }, 
        { status: 404 }
      );
    }

    // Success response
    return NextResponse.json({ data });
  } catch (error) {
    // Catch unexpected errors
    logger.error('Unexpected error in course API', { 
      error: error instanceof Error ? error.message : String(error),
      courseId: params.id
    });
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}
```

### Error Response Structure

Use a consistent error response structure throughout the API:

```ts
// Standard error response structure
interface ErrorResponse {
  error: {
    message: string;      // User-friendly error message
    code?: string;        // Optional error code for client logic
    details?: unknown;    // Optional details for debugging (omitted in production)
  };
  status: number;         // HTTP status code
}

// Example helper function to create error responses
function createErrorResponse(
  message: string, 
  status: number, 
  code?: string, 
  details?: unknown
): ErrorResponse {
  const response: ErrorResponse = {
    error: { message },
    status
  };
  
  if (code) response.error.code = code;
  
  // Only include details in development
  if (details && process.env.NODE_ENV === 'development') {
    response.error.details = details;
  }
  
  return response;
}
```

### Database Error Handling

When working with Supabase, handle database errors consistently:

```ts
// lib/supabase/error-handling.ts
import { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export function handleDatabaseError(error: PostgrestError, context: string, metadata?: Record<string, any>) {
  // Map common database errors to user-friendly messages
  let userMessage = 'A database error occurred';
  
  // Log with detailed information for debugging
  logger.error(`Database error in ${context}`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    ...metadata
  });

  // Common PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      userMessage = 'This record already exists';
      break;
    case '23503': // foreign_key_violation
      userMessage = 'This operation references a record that does not exist';
      break;
    case '42P01': // undefined_table
      userMessage = 'System error: database configuration issue';
      break;
    case '42703': // undefined_column
      userMessage = 'System error: database configuration issue';
      break;
    // Add more cases as needed
  }

  return {
    userMessage,
    originalError: error
  };
}
```

## Error Reporting

### Error Tracking Integration

The platform uses a centralized error tracking solution:

1. **Automatic Capture**: Unhandled exceptions are automatically captured
2. **Manual Reporting**: Critical errors are manually reported with context
3. **User Feedback**: Users can submit feedback when they encounter errors

```ts
// lib/error-reporting.ts
import { captureException, addBreadcrumb, setUser, withScope } from '@sentry/nextjs'; // Example with Sentry

export function reportError(error: Error, context?: Record<string, any>) {
  // Add additional context as breadcrumbs
  if (context) {
    addBreadcrumb({
      category: 'app',
      message: 'Error context',
      level: 'error',
      data: context
    });
  }

  // Report to monitoring service
  withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    captureException(error);
  });
}

// Example of setting user context for better error tracking
export function setErrorReportingUser(user: { id: string; email?: string }) {
  setUser({
    id: user.id,
    email: user.email
  });
}
```

### User Error Reporting

Allow users to report errors they encounter:

```tsx
// components/error-reporter.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { reportErrorWithUserFeedback } from '@/lib/error-reporting';

interface ErrorReporterProps {
  error: Error;
  context?: Record<string, any>;
}

export function ErrorReporter({ error, context }: ErrorReporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await reportErrorWithUserFeedback(error, feedback, context);
      setIsSubmitted(true);
    } catch (reportError) {
      console.error('Failed to submit error report:', reportError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="link" onClick={() => setIsOpen(true)}>
        Report this issue
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
          </DialogHeader>
          
          {!isSubmitted ? (
            <>
              <p className="text-sm text-muted-foreground">
                Please describe what you were doing when this error occurred.
                This information helps us fix the issue faster.
              </p>
              
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="I was trying to..."
                className="min-h-[100px]"
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <p className="text-sm text-green-600">
                Thank you for your feedback! We'll work on fixing this issue.
              </p>
              
              <DialogFooter>
                <Button onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## Logging Standards

### Logging Levels

Define clear logging levels and their usage:

1. **ERROR**: Unexpected errors that affect functionality
2. **WARN**: Potential issues that don't immediately affect functionality
3. **INFO**: General informational messages about system operation
4. **DEBUG**: Detailed information for debugging purposes (not in production)
5. **TRACE**: Very detailed information for debugging specific issues (not in production)

### Logging Structure

All log entries should include:

1. **Timestamp**: When the event occurred
2. **Level**: Logging level (ERROR, WARN, INFO, DEBUG, TRACE)
3. **Message**: Clear, concise description of the event
4. **Context**: Relevant contextual information (user ID, request ID, etc.)
5. **Metadata**: Additional structured data relevant to the event

### Logging Implementation

```ts
// lib/logger.ts
type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }
  
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }
  
  debug(message: string, context?: LogContext) {
    // Only log in development by default
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }
  
  trace(message: string, context?: LogContext) {
    // Only log in development by default
    if (this.isDevelopment) {
      this.log('trace', message, context);
    }
  }
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context
    };
    
    // In production, send to a proper logging service
    if (process.env.NODE_ENV === 'production') {
      // Example of sending to a logging service
      // sendToLoggingService(logEntry);
      
      // Also log to console in a sanitized way (no sensitive data)
      const consoleFn = this.getConsoleMethod(level);
      consoleFn(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    } else {
      // In development, log with full context
      const consoleFn = this.getConsoleMethod(level);
      consoleFn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, context || '');
    }
  }
  
  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case 'error': return console.error;
      case 'warn': return console.warn;
      case 'info': return console.info;
      case 'debug': return console.debug;
      case 'trace': return console.trace;
      default: return console.log;
    }
  }
}

// Export singleton instance
export const logger = new Logger();
```

### Context Inclusion

Include relevant context with every log:

```ts
// Example of logging with context
import { logger } from '@/lib/logger';

// In authentication logic
logger.info('User login successful', { 
  userId: user.id,
  email: user.email,
  loginMethod: 'password'
});

// In API request handlers
logger.info('API request received', {
  endpoint: '/api/courses',
  method: 'GET',
  query: request.query,
  requestId: requestId
});

// For errors
logger.error('Failed to update user profile', {
  userId: user.id,
  error: error.message,
  stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
});
```

## Monitoring Approach

### Key Metrics

Monitor these critical metrics:

1. **Error Rate**: Percentage of requests resulting in errors
2. **API Response Time**: Duration of API requests
3. **Page Load Time**: Time to load and render pages
4. **API Request Volume**: Number of API requests over time
5. **Authentication Failures**: Number and rate of failed login attempts
6. **Database Query Performance**: Duration of database queries
7. **Memory Usage**: Server memory consumption
8. **CPU Usage**: Server CPU utilization

### Alerting Thresholds

Set up alerts for these conditions:

1. **Error Spike**: Error rate exceeds 5% over 5-minute period
2. **Slow Response**: 90th percentile response time exceeds 3 seconds
3. **Authentication Anomalies**: Unusual pattern of authentication failures
4. **Database Performance**: Query times exceed 1 second average
5. **Resource Saturation**: CPU or memory usage exceeds 85%
6. **API Availability**: Endpoint availability falls below 99.9%

### Incident Response Workflow

1. **Alert Triggered**: System detects an issue and sends notification
2. **Acknowledge**: Team member acknowledges the alert
3. **Investigate**: Identify the root cause using logs and monitoring tools
4. **Mitigate**: Implement immediate fixes to restore service
5. **Resolve**: Deploy permanent solution
6. **Retrospective**: Document incident, cause, resolution, and prevention measures

## Implementation Examples

### Next.js Error Page

Create custom error pages for different error scenarios:

```tsx
// app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mt-4 text-lg text-muted-foreground text-center max-w-md">
        Sorry, we couldn't find the page you're looking for.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/courses">Browse Courses</Link>
        </Button>
      </div>
    </div>
  );
}

// app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorReporter } from '@/components/error-reporter';
import { logger } from '@/lib/logger';

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error
    logger.error('Unhandled application error', {
      message: error.message,
      stack: error.stack
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
        <p className="mt-4 text-muted-foreground">
          We're sorry, but something unexpected happened. Our team has been notified.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <ErrorReporter error={error} />
        </div>
      </div>
    </div>
  );
}
```

### Component Loading and Error States

Implement consistent loading and error states for components:

```tsx
// components/async-content.tsx
interface AsyncContentProps<T> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

export function AsyncContent<T>({
  isLoading,
  error,
  data,
  loadingComponent,
  errorComponent,
  children,
}: AsyncContentProps<T>) {
  if (isLoading) {
    return loadingComponent || <div className="p-4 animate-pulse">Loading...</div>;
  }

  if (error) {
    return errorComponent || (
      <div className="p-4 text-red-600">
        <p>Error: {error.message}</p>
        <button
          className="mt-2 text-sm underline"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <div className="p-4">No data available</div>;
  }

  return children(data);
}

// Usage example
<AsyncContent
  isLoading={isLoading}
  error={error}
  data={courseData}
  loadingComponent={<CourseSkeleton />}
  errorComponent={
    <div className="p-6 border rounded-lg bg-red-50">
      <h3>Failed to load course</h3>
      <p>{error?.message}</p>
      <Button onClick={retry}>Try Again</Button>
    </div>
  }
>
  {(course) => (
    <CourseDetail course={course} />
  )}
</AsyncContent>
```

---

*Last updated: March 24, 2024* 