/**
 * Security module index
 * Exports all security-related utilities and middleware
 */

// Export middleware composition utilities
export * from './middleware';

// Export rate limiting utilities
export * from './rate-limiter';

// Export security headers utilities
export * from './security-headers';

// Export CSRF protection utilities
export * from './csrf-protection';

// Export suspicious activity detection utilities
export * from './suspicious-activity';

// Export secure cookie utilities
export * from './secure-cookies';

// Export JWT security utilities
export * from './jwt-security';

// Export security logger utilities
export * from './security-logger';

// Export security tester utilities
export * from './security-tester';

// Export security audit utilities
export * from './security-audit';

// Export security monitoring utilities
export * from './monitoring/security-monitor';

// Export a combined security middleware
import { composeSecurityMiddleware, type SecurityMiddleware } from './middleware';
import { rateLimiters } from './rate-limiter';
import { securityHeaders } from './security-headers';
import { csrfProtection, setCSRFTokens } from './csrf-protection';
import { suspiciousActivityDetection } from './suspicious-activity';
import { secureCookies } from './secure-cookies';
import { jwtSecurity } from './jwt-security';
import { securityLogger } from './security-logger';
import { runSecurityTests } from './security-tester';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Default security middleware that combines all security measures
 * This can be used directly in the Next.js middleware
 */
export const defaultSecurityMiddleware: SecurityMiddleware = composeSecurityMiddleware(
  securityHeaders,
  secureCookies,
  suspiciousActivityDetection
);

/**
 * API route security middleware that includes CSRF protection
 * This should be used for API routes that change state
 */
export const apiSecurityMiddleware: SecurityMiddleware = composeSecurityMiddleware(
  securityHeaders,
  secureCookies,
  csrfProtection,
  suspiciousActivityDetection
);

/**
 * Authentication security middleware that includes rate limiting
 * This should be used for authentication-related endpoints
 */
export const authSecurityMiddleware: SecurityMiddleware = composeSecurityMiddleware(
  securityHeaders,
  secureCookies,
  suspiciousActivityDetection
);

/**
 * Apply rate limiting to a specific endpoint
 * This is a helper function to apply rate limiting to a specific endpoint
 */
export function applyRateLimiting(
  request: NextRequest,
  response: NextResponse,
  endpoint: keyof typeof rateLimiters
): Promise<NextResponse> {
  return rateLimiters[endpoint](request, response);
}

/**
 * Prepare a response for a form submission
 * This adds CSRF tokens to the response
 */
export function prepareFormResponse(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  return setCSRFTokens(request, response);
}
