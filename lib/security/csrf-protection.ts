/**
 * CSRF Protection middleware
 * Implements Cross-Site Request Forgery protection using the double submit cookie pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

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
 * Generate a random CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a CSRF token
 * This creates a hash that can be stored in a cookie while the original token
 * is sent to the client for inclusion in subsequent requests
 */
export function hashCSRFToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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
  
  return async function csrfProtectionMiddleware(request: NextRequest, response: NextResponse) {
    const { method } = request;
    const ignoreMethods = mergedConfig.ignoreMethods || [];
    
    // Skip CSRF check for ignored methods
    if (ignoreMethods.includes(method)) {
      return response;
    }
    
    // Get the CSRF token from the request
    const csrfToken = request.headers.get(mergedConfig.headerName || '') || 
                      request.cookies.get(mergedConfig.cookieName || '')?.value;
    
    // Get the CSRF token hash from the cookie
    const storedTokenHash = request.cookies.get(`${mergedConfig.cookieName}-hash`)?.value;
    
    // If we have both a token and a hash, validate them
    if (csrfToken && storedTokenHash) {
      const calculatedHash = hashCSRFToken(csrfToken);
      
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
export function setCSRFTokens(request: NextRequest, response: NextResponse, config: CSRFConfig = {}) {
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
  const tokenHash = hashCSRFToken(token);
  
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
