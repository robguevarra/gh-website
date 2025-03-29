import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { createServiceRoleClient } from './server';

/**
 * Creates a Supabase client for use in route handlers
 * Using the modern SSR package from Supabase
 */
export const createRouteHandlerClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          const cookie = await cookieStore.get(name);
          return cookie?.value;
        },
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie mutation errors in edge functions
            console.error('Cookie set error:', error);
          }
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          } catch (error) {
            // Handle cookie mutation errors in edge functions
            console.error('Cookie remove error:', error);
          }
        },
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );
};

// Helper function to validate admin access
export const validateAdminAccess = async () => {
  const supabase = await createRouteHandlerClient();
  const serviceClient = await createServiceRoleClient();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return {
      error: 'Unauthorized: Authentication required',
      status: 401
    };
  }
  
  // Check if user has admin role
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single();
  
  if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
    return {
      error: 'Forbidden: Admin access required',
      status: 403
    };
  }
  
  return { user, profile };
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