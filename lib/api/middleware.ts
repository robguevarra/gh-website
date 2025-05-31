/**
 * API middleware for applying security measures to API routes
 * This provides a wrapper for Next.js API route handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiSecurityMiddleware, applyRateLimiting } from '@/lib/security';

// Type for API route handler
type APIRouteHandler = (
  request: NextRequest,
  response: NextResponse
) => Promise<NextResponse> | NextResponse;

// Type for API middleware options
interface APIMiddlewareOptions {
  // Whether to apply CSRF protection
  csrfProtection?: boolean;
  // Whether to apply rate limiting
  rateLimiting?: {
    // The rate limiter to use
    limiter: 'login' | 'signup' | 'passwordReset' | 'otpVerification' | 'api';
  };
  // Whether to skip authentication check
  skipAuth?: boolean;
}

/**
 * Wrap an API route handler with security middleware
 * This applies security measures to the API route
 */
export function withAPIMiddleware(
  handler: APIRouteHandler,
  options: APIMiddlewareOptions = {}
): APIRouteHandler {
  return async (request: NextRequest, response: NextResponse) => {
    try {
      // Apply security middleware
      response = await apiSecurityMiddleware(request, response);
      
      // Apply rate limiting if specified
      if (options.rateLimiting) {
        response = await applyRateLimiting(
          request,
          response,
          options.rateLimiting.limiter
        );
      }
      
      // If response status is not 200, return it (e.g., rate limited)
      if (response.status !== 200) {
        return response;
      }
      
      // Call the handler
      return await handler(request, response);
    } catch (error) {
      console.error('API middleware error:', error);
      
      // Return a 500 error
      return new NextResponse(
        JSON.stringify({ error: 'Internal Server Error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}

/**
 * Wrap an authentication API route handler with security middleware
 * This applies additional security measures specific to authentication routes
 */
export function withAuthAPIMiddleware(
  handler: APIRouteHandler,
  options: Omit<APIMiddlewareOptions, 'skipAuth'> = {}
): APIRouteHandler {
  return withAPIMiddleware(handler, {
    ...options,
    // Always apply CSRF protection for auth routes
    csrfProtection: options.csrfProtection !== false,
    // Skip auth check for auth routes
    skipAuth: true,
  });
}
