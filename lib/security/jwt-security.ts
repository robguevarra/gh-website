/**
 * JWT security utilities
 * Implements best practices for JWT token handling and security
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, CookieOptions } from '@supabase/ssr';
import { setSecureCookie, removeSecureCookie } from './secure-cookies';

// Interface for JWT security configuration
export interface JWTSecurityConfig {
  // Access token expiration time in seconds
  accessTokenExpiresIn?: number;
  // Refresh token expiration time in seconds
  refreshTokenExpiresIn?: number;
  // Whether to use secure cookies for tokens
  useSecureCookies?: boolean;
  // Cookie options for tokens
  cookieOptions?: Partial<CookieOptions>;
}

// Default JWT security configuration
const DEFAULT_CONFIG: JWTSecurityConfig = {
  accessTokenExpiresIn: 3600, // 1 hour
  refreshTokenExpiresIn: 604800, // 7 days
  useSecureCookies: true,
  cookieOptions: {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
};

/**
 * Create a JWT security middleware with the given configuration
 * This middleware enhances JWT security by applying best practices
 */
export function createJWTSecurity(config: JWTSecurityConfig = {}) {
  // Merge default config with provided config
  const mergedConfig: JWTSecurityConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    cookieOptions: {
      ...DEFAULT_CONFIG.cookieOptions,
      ...config.cookieOptions,
    },
  };
  
  return async function jwtSecurityMiddleware(request: NextRequest, response: NextResponse) {
    // We don't modify the response directly here
    // This middleware is primarily for use with the functions below
    return response;
  };
}

/**
 * Securely store JWT tokens in cookies
 * This should be used when setting tokens after authentication
 */
export function securelyStoreTokens(
  response: NextResponse,
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
  },
  config: JWTSecurityConfig = DEFAULT_CONFIG
): NextResponse {
  const { access_token, refresh_token, expires_at } = tokens;
  
  // Calculate expiration times
  const accessTokenMaxAge = expires_at 
    ? Math.floor((expires_at * 1000 - Date.now()) / 1000)
    : config.accessTokenExpiresIn;
  
  const refreshTokenMaxAge = config.refreshTokenExpiresIn;
  
  // Set the access token cookie
  if (config.useSecureCookies) {
    setSecureCookie(
      response,
      'access_token',
      access_token,
      {
        ...config.cookieOptions,
        maxAge: accessTokenMaxAge,
      }
    );
    
    // Set the refresh token cookie
    setSecureCookie(
      response,
      'refresh_token',
      refresh_token,
      {
        ...config.cookieOptions,
        maxAge: refreshTokenMaxAge,
      }
    );
  } else {
    // Fallback to regular cookies
    response.cookies.set({
      name: 'access_token',
      value: access_token,
      ...config.cookieOptions,
      maxAge: accessTokenMaxAge,
    });
    
    response.cookies.set({
      name: 'refresh_token',
      value: refresh_token,
      ...config.cookieOptions,
      maxAge: refreshTokenMaxAge,
    });
  }
  
  return response;
}

/**
 * Clear JWT tokens from cookies
 * This should be used when logging out
 */
export function clearTokens(
  response: NextResponse,
  config: JWTSecurityConfig = DEFAULT_CONFIG
): NextResponse {
  if (config.useSecureCookies) {
    removeSecureCookie(response, 'access_token', config.cookieOptions);
    removeSecureCookie(response, 'refresh_token', config.cookieOptions);
  } else {
    response.cookies.delete({
      name: 'access_token',
      ...config.cookieOptions,
    });
    
    response.cookies.delete({
      name: 'refresh_token',
      ...config.cookieOptions,
    });
  }
  
  return response;
}

/**
 * Refresh JWT tokens
 * This should be used to refresh tokens before they expire
 */
export async function refreshTokens(
  request: NextRequest,
  response: NextResponse,
  config: JWTSecurityConfig = DEFAULT_CONFIG
): Promise<NextResponse> {
  // Create a Supabase client for refreshing tokens
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // We'll handle setting cookies ourselves
        },
        remove(name: string, options: CookieOptions) {
          // We'll handle removing cookies ourselves
        },
      },
    }
  );
  
  try {
    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing tokens:', error);
      return clearTokens(response, config);
    }
    
    if (data.session) {
      // Store the new tokens
      return securelyStoreTokens(
        response,
        {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        config
      );
    }
  } catch (error) {
    console.error('Unexpected error refreshing tokens:', error);
  }
  
  return response;
}

// Export a default instance with standard configuration
export const jwtSecurity = createJWTSecurity();
