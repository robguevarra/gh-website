/**
 * CSRF Protection middleware
 * Implements Cross-Site Request Forgery protection using the double submit cookie pattern
 */

import { NextRequest, NextResponse } from 'next/server';

// Interface for CSRF configuration
export interface CSRFConfig {
  // Cookie name for the CSRF token
  cookieName?: string;
  // Header name for the CSRF token
  headerName?: string;
  // Form field name for the CSRF token
  formFieldName?: string;
  // Cookie options
  cookieOptions?: {
    // Cookie path
    path?: string;
    // Cookie max age in seconds
    maxAge?: number;
    // Cookie same site policy
    sameSite?: 'strict' | 'lax' | 'none';
    // Cookie secure flag
    secure?: boolean;
    // Cookie HTTP only flag
    httpOnly?: boolean;
  };
  // Whether to ignore GET, HEAD, OPTIONS requests
  ignoreMethods?: string[];
}

// Default CSRF configuration
const DEFAULT_CONFIG: CSRFConfig = {
  cookieName: 'csrf-token',
  headerName: 'X-CSRF-Token',
  formFieldName: '_csrf',
  cookieOptions: {
    path: '/',
    maxAge: 3600, // 1 hour
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
};

/**
 * Generate a random CSRF token using Web Crypto API for Edge compatibility
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a CSRF token using Web Crypto API for Edge compatibility
 * This creates a hash that can be stored in a cookie while the original token
 * is sent to the client for inclusion in subsequent requests
 */
export async function hashCSRFToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a CSRF protection middleware with the given configuration
 */
export function createCSRFProtection(config: CSRFConfig = {}) {
  // Merge default config with provided config
  const mergedConfig: CSRFConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    cookieOptions: {
      ...DEFAULT_CONFIG.cookieOptions,
      ...config.cookieOptions,
    },
  };
  
  return async function csrfProtectionMiddleware(
    request: NextRequest,
    response: NextResponse
  ) {
    // Check if method should be ignored
    if (
      mergedConfig.ignoreMethods &&
      mergedConfig.ignoreMethods.includes(request.method)
    ) {
      return response;
    }
    
    // Get the CSRF token from the header or form data
    let csrfToken: string | undefined;
    
    // Try to get the token from the header
    csrfToken = request.headers.get(mergedConfig.headerName || 'X-CSRF-Token') || undefined;
    
    // If no token in header, try to get it from form data (if it's a form submission)
    if (!csrfToken && request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      csrfToken = formData.get(mergedConfig.formFieldName || '_csrf')?.toString();
    }
    
    // Get the stored token hash from the cookie
    const storedTokenHash = request.cookies.get(`${mergedConfig.cookieName}-hash`)?.value;
    
    // If we have both a token and a hash, validate them
    if (csrfToken && storedTokenHash) {
      const calculatedHash = await hashCSRFToken(csrfToken);
      
      // If the hashes don't match, reject the request
      if (calculatedHash !== storedTokenHash) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } else {
      // If we don't have both a token and a hash, reject the request
      return new NextResponse(
        JSON.stringify({ error: 'CSRF token required' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    return response;
  };
}

/**
 * Set CSRF tokens in the response
 * This should be called before sending a form to the client
 */
export async function setCSRFTokens(request: NextRequest, response: NextResponse, config: CSRFConfig = {}) {
  // Merge default config with provided config
  const mergedConfig: CSRFConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    cookieOptions: {
      ...DEFAULT_CONFIG.cookieOptions,
      ...config.cookieOptions,
    },
  };
  
  // Generate a new CSRF token
  const token = generateCSRFToken();
  const tokenHash = await hashCSRFToken(token);
  
  // Set the CSRF token cookie
  response.cookies.set({
    name: mergedConfig.cookieName || 'csrf-token',
    value: token,
    ...mergedConfig.cookieOptions,
  });
  
  // Set the CSRF token hash cookie
  response.cookies.set({
    name: `${mergedConfig.cookieName}-hash`,
    value: tokenHash,
    ...mergedConfig.cookieOptions,
  });
  
  // Add the CSRF token to the response headers
  response.headers.set(mergedConfig.headerName || 'X-CSRF-Token', token);
  
  return response;
}

// Export a default instance with standard configuration
export const csrfProtection = createCSRFProtection();
