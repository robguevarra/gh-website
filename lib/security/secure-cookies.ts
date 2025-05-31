/**
 * Secure cookie handling utilities
 * Implements best practices for cookie security
 */

import { NextRequest, NextResponse } from 'next/server';
import { CookieOptions } from '@supabase/ssr';

// Interface for secure cookie configuration
export interface SecureCookieConfig {
  // Default path for cookies
  defaultPath?: string;
  // Default max age for cookies in seconds
  defaultMaxAge?: number;
  // Default same site policy
  defaultSameSite?: 'strict' | 'lax' | 'none';
  // Whether to set the secure flag by default
  defaultSecure?: boolean;
  // Whether to set the httpOnly flag by default
  defaultHttpOnly?: boolean;
  // Whether to use cookie prefixing
  useCookiePrefixing?: boolean;
}

// Default secure cookie configuration
const DEFAULT_CONFIG: SecureCookieConfig = {
  defaultPath: '/',
  defaultMaxAge: 86400, // 24 hours
  defaultSameSite: 'lax',
  defaultSecure: process.env.NODE_ENV === 'production',
  defaultHttpOnly: true,
  useCookiePrefixing: true,
};

/**
 * Create a secure cookie middleware with the given configuration
 * This middleware enhances cookie security by applying best practices
 */
export function createSecureCookies(config: SecureCookieConfig = {}) {
  // Merge default config with provided config
  const mergedConfig: SecureCookieConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  
  return function secureCookiesMiddleware(_request: NextRequest, response: NextResponse) {
    // Add a Set-Cookie header to instruct browsers to remove any insecure cookies
    // This helps mitigate cookie hijacking by ensuring cookies are only sent over HTTPS
    if (mergedConfig.defaultSecure) {
      response.headers.append('Set-Cookie', 'insecure=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure');
    }
    
    return response;
  };
}

/**
 * Set a secure cookie with appropriate security flags
 */
export function setSecureCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: Partial<CookieOptions> = {},
  config: SecureCookieConfig = DEFAULT_CONFIG
): NextResponse {
  // Apply cookie prefixing if enabled
  // This helps prevent cookie injection attacks
  let cookieName = name;
  if (config.useCookiePrefixing) {
    if (config.defaultSecure && !cookieName.startsWith('__Secure-')) {
      cookieName = `__Secure-${cookieName}`;
    }
    if (config.defaultSameSite === 'strict' && !cookieName.startsWith('__Host-')) {
      cookieName = `__Host-${cookieName}`;
    }
  }
  
  // Set the cookie with secure defaults
  response.cookies.set({
    name: cookieName,
    value,
    path: options.path || config.defaultPath,
    maxAge: options.maxAge || config.defaultMaxAge,
    sameSite: options.sameSite || config.defaultSameSite,
    secure: options.secure !== undefined ? options.secure : config.defaultSecure,
    httpOnly: options.httpOnly !== undefined ? options.httpOnly : config.defaultHttpOnly,
    domain: options.domain, // Domain is intentionally not defaulted
  });
  
  return response;
}

/**
 * Get a secure cookie value, accounting for cookie prefixing
 */
export function getSecureCookie(
  request: NextRequest,
  name: string,
  config: SecureCookieConfig = DEFAULT_CONFIG
): string | undefined {
  // Try to get the cookie with the original name
  let cookie = request.cookies.get(name);
  
  // If cookie prefixing is enabled and we didn't find the cookie,
  // try with the prefixed names
  if (!cookie && config.useCookiePrefixing) {
    if (config.defaultSecure) {
      cookie = request.cookies.get(`__Secure-${name}`);
    }
    if (!cookie && config.defaultSameSite === 'strict') {
      cookie = request.cookies.get(`__Host-${name}`);
    }
  }
  
  return cookie?.value;
}

/**
 * Remove a secure cookie, accounting for cookie prefixing
 */
export function removeSecureCookie(
  response: NextResponse,
  name: string,
  options: Partial<CookieOptions> = {},
  config: SecureCookieConfig = DEFAULT_CONFIG
): NextResponse {
  // Remove the cookie with the original name
  response.cookies.delete({
    name,
    path: options.path || config.defaultPath,
    domain: options.domain,
  });
  
  // If cookie prefixing is enabled, also remove the prefixed cookies
  if (config.useCookiePrefixing) {
    if (config.defaultSecure) {
      response.cookies.delete({
        name: `__Secure-${name}`,
        path: options.path || config.defaultPath,
        domain: options.domain,
      });
    }
    if (config.defaultSameSite === 'strict') {
      response.cookies.delete({
        name: `__Host-${name}`,
        path: options.path || config.defaultPath,
        domain: options.domain,
      });
    }
  }
  
  return response;
}

// Export a default instance with standard configuration
export const secureCookies = createSecureCookies();
