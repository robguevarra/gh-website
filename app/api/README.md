# API Route Structure

This document outlines the organization and conventions for API routes in the Graceful Homeschooling platform.

## Overview

API routes in Next.js App Router are defined using the `route.ts` file with handler functions for HTTP methods. The Graceful Homeschooling platform follows RESTful API design principles with standardized request/response formats and error handling.

## Directory Structure

API routes follow a resource-oriented structure:

```
app/
  api/
    v1/                      # API version
      courses/
        route.ts            # GET, POST /api/v1/courses
        [courseId]/
          route.ts          # GET, PUT, DELETE /api/v1/courses/:courseId
          enroll/
            route.ts        # POST /api/v1/courses/:courseId/enroll
          lessons/
            route.ts        # GET, POST /api/v1/courses/:courseId/lessons
            [lessonId]/
              route.ts      # GET, PUT, DELETE /api/v1/courses/:courseId/lessons/:lessonId
      users/
        route.ts            # GET, POST /api/v1/users
        [userId]/
          route.ts          # GET, PUT, DELETE /api/v1/users/:userId
      webhooks/
        stripe/
          route.ts          # POST /api/v1/webhooks/stripe
```

## RESTful Conventions

### HTTP Methods

- `GET`: Retrieve resources
- `POST`: Create resources
- `PUT`: Update resources (full update)
- `PATCH`: Partial update of resources
- `DELETE`: Remove resources

### URL Naming

- Use nouns for resources (e.g., `/courses`, `/users`)
- Use plural form for collection endpoints
- Use nested resources for relationships (e.g., `/courses/:courseId/lessons`)
- Keep URLs lowercase with hyphens for multi-word resources (e.g., `/course-categories`)
- Avoid deep nesting (max 2-3 levels deep)

### Route Handler Structure

```typescript
// app/api/v1/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createCourse, getCourses } from "@/lib/supabase/courses";
import { validateCourseData } from "@/lib/validators/course-validators";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");
    
    // Get courses with pagination
    const { data, count } = await getCourses({ limit, page });
    
    // Return response with metadata
    return NextResponse.json({
      status: "success",
      data,
      meta: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = validateCourseData(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "Invalid course data", 
          errors: validationResult.errors 
        },
        { status: 400 }
      );
    }
    
    // Create course
    const course = await createCourse(validationResult.data);
    
    // Return success response
    return NextResponse.json(
      { status: "success", data: course },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to create course" },
      { status: 500 }
    );
  }
}
```

## API Versioning

- All API routes are versioned to allow for future changes
- Version is included in the URL path (e.g., `/api/v1/courses`)
- When breaking changes are needed, increment the version number (e.g., `/api/v2/courses`)
- Maintain backwards compatibility for a reasonable period

## Next.js 15+ Dynamic APIs

Next.js 15+ introduces important changes to dynamic APIs that developers should be aware of:

### Asynchronous API Functions

In Next.js 15+, the following dynamic API functions are asynchronous:
- `cookies()`
- `headers()`
- `params` and `searchParams` props for pages and layouts

This means you must `await` these functions or use `React.use()` to unwrap the Promise:

```typescript
// Before (Next.js 14)
export function GET(request: Request) {
  const cookieStore = cookies()
  // Use cookieStore directly
}

// After (Next.js 15+)
export async function GET(request: Request) {
  const cookieStore = await cookies()
  // Now cookieStore is properly awaited
}
```

### Migration Considerations

When updating API routes for Next.js 15+:

1. Add `async` keyword to route handlers if they use dynamic APIs
2. Update any code that relies on these APIs to properly await the result
3. Test thoroughly to ensure all async operations are properly handled

### Working with Supabase

This change particularly affects authentication with Supabase, where cookie handling must be updated:

```typescript
// Updated pattern for Supabase auth in API routes
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        // Other cookie methods...
      },
    }
  )
  
  // Now use supabase client
}
```

## Request and Response Formats

### Request Format

- Use JSON for request bodies
- Use query parameters for filtering, pagination, and sorting
- Use URL parameters for resource identifiers

### Response Format

All API responses follow a consistent structure:

```json
{
  "status": "success | error",
  "data": { ... },  // For successful responses
  "message": "...", // For error responses
  "errors": [ ... ], // Validation errors (optional)
  "meta": {         // Metadata for pagination, etc. (optional)
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

### Status Codes

- `200 OK`: Successful GET, PUT, PATCH requests
- `201 Created`: Successful POST requests
- `204 No Content`: Successful DELETE requests
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation errors
- `500 Internal Server Error`: Server-side errors

## Middleware and Validation

### Authentication Middleware

- API routes requiring authentication use middleware
- JWT tokens are validated in middleware
- User information is attached to the request for authorized routes

Example middleware usage:
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session and accessing protected route
  if (!session && request.nextUrl.pathname.startsWith('/api/v1/protected')) {
    return NextResponse.json(
      { status: 'error', message: 'Unauthorized' },
      { status: 401 }
    );
  }

  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
```

### Request Validation

- Use Zod or similar libraries for request validation
- Create reusable validation schemas for consistent data validation
- Return detailed validation errors with appropriate status codes

Example validation schema:
```typescript
// lib/validators/course-validators.ts
import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  imageUrl: z.string().url().optional(),
  price: z.number().min(0),
  published: z.boolean().default(false),
});

export function validateCourseData(data: unknown) {
  const result = courseSchema.safeParse(data);
  if (result.success) {
    return result;
  }
  
  return {
    success: false,
    errors: result.error.format()
  };
}
```

## Error Handling

- Use try/catch blocks for all asynchronous operations
- Return standardized error responses
- Log errors appropriately for debugging
- Include error codes for client-side error handling

Example error handling:
```typescript
try {
  // API logic
} catch (error) {
  console.error(`[API Error] ${request.url}:`, error);
  
  // Determine if error is known type or unexpected
  if (error instanceof CustomError) {
    return NextResponse.json(
      { 
        status: "error", 
        message: error.message,
        code: error.code 
      },
      { status: error.statusCode }
    );
  }
  
  // Default to 500 for unexpected errors
  return NextResponse.json(
    { status: "error", message: "An unexpected error occurred" },
    { status: 500 }
  );
}
```

## Rate Limiting and Security

- Implement rate limiting for API routes
- Use CORS headers for cross-origin requests
- Validate and sanitize all user inputs
- Implement proper authorization checks

Example rate limiting:
```typescript
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// Simple rate limiter middleware
export async function rateLimiter(request: NextRequest) {
  const ip = request.ip || '';
  const limit = 100; // requests per minute
  const ttl = 60; // 1 minute
  
  const key = `rate-limit:${ip}`;
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttl);
  }
  
  if (count > limit) {
    return NextResponse.json(
      { status: 'error', message: 'Too many requests' },
      { status: 429 }
    );
  }
  
  return null; // Continue to the handler
}
```

## API Documentation

- Use JSDoc comments to document API routes
- Include examples of requests and responses
- Document required permissions and rate limits
- Keep documentation in sync with implementation

Example JSDoc:
```typescript
/**
 * @api {get} /api/v1/courses Get all courses
 * @apiName GetCourses
 * @apiGroup Courses
 * @apiVersion 1.0.0
 * 
 * @apiParam {Number} [limit=10] Number of courses to return
 * @apiParam {Number} [page=1] Page number
 * 
 * @apiSuccess {String} status Status of the response
 * @apiSuccess {Object[]} data List of courses
 * @apiSuccess {Object} meta Pagination metadata
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "status": "success",
 *       "data": [
 *         {
 *           "id": "123",
 *           "title": "Math Fundamentals",
 *           "description": "Learn the basics of mathematics",
 *           "imageUrl": "/images/math.jpg"
 *         }
 *       ],
 *       "meta": {
 *         "total": 100,
 *         "page": 1,
 *         "limit": 10,
 *         "pages": 10
 *       }
 *     }
 */
```

## Webhooks

- Webhooks are handled in dedicated routes
- Implement proper validation of webhook signatures
- Process webhooks asynchronously when possible
- Return quick acknowledgments to webhook sources

Example webhook handler:
```typescript
// app/api/v1/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { buffer } from "micro";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      // Handle other event types...
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Process completed checkout
  // Update database, send confirmation emails, etc.
}

export const config = {
  api: {
    bodyParser: false, // Don't parse the body to verify signature
  },
};
``` 