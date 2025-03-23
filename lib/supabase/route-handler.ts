import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

type CookieOptions = {
  name?: string;
  value?: string;
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
};

/**
 * Creates a Supabase client for use in route handlers
 * Using the modern SSR package from Supabase
 */
export const createRouteHandlerClient = () => {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set: (name: string, value: string, options: CookieOptions) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: CookieOptions) => {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
};

// Helper function to handle unauthorized access
export const handleUnauthorized = () => {
  return Response.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
};

// Helper function to handle admin-only access
export const handleAdminOnly = () => {
  return Response.json(
    { error: 'Admin access required' },
    { status: 403 }
  );
};

// Helper function to handle not found errors
export const handleNotFound = (resource = 'Resource') => {
  return Response.json(
    { error: `${resource} not found` },
    { status: 404 }
  );
};

// Helper function to handle server errors
export const handleServerError = (error: unknown, message = 'Internal server error') => {
  console.error(`Server error: ${message}`, error);
  return Response.json(
    { error: message },
    { status: 500 }
  );
}; 