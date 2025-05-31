/**
 * Security middleware composition pattern
 * This file provides utilities for composing multiple security middleware functions
 */

import { NextRequest, NextResponse } from 'next/server';

// Define the type for a middleware function
export type SecurityMiddleware = (
  request: NextRequest,
  response: NextResponse
) => Promise<NextResponse> | NextResponse;

/**
 * Compose multiple security middleware functions into a single middleware
 * Each middleware will be executed in sequence, with the response from one
 * being passed to the next.
 */
export function composeSecurityMiddleware(
  ...middlewares: SecurityMiddleware[]
): SecurityMiddleware {
  return async (request: NextRequest, response: NextResponse) => {
    let result = response;
    
    for (const middleware of middlewares) {
      try {
        result = await middleware(request, result);
      } catch (error) {
        console.error('Security middleware error:', error);
        // Continue to next middleware even if one fails
      }
    }
    
    return result;
  };
}

/**
 * Apply security middleware to a response
 * This is a helper function to apply security middleware to a response
 * without having to manually chain them.
 */
export async function applySecurityMiddleware(
  request: NextRequest,
  response: NextResponse,
  ...middlewares: SecurityMiddleware[]
): Promise<NextResponse> {
  return composeSecurityMiddleware(...middlewares)(request, response);
}
