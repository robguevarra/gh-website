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
  
  // Check if user has admin role in unified_profiles (modern approach)
  const { data: unifiedProfile, error: unifiedError } = await serviceClient
    .from('unified_profiles')
    .select('is_admin, status, tags')
    .eq('id', user.id)
    .single();
  
  // If unified profile exists, use it for admin validation
  if (!unifiedError && unifiedProfile) {
    const isAdminByFlag = unifiedProfile.is_admin === true;
    const isAdminByTag = unifiedProfile.tags && Array.isArray(unifiedProfile.tags) && unifiedProfile.tags.includes('admin');
    const isActive = unifiedProfile.status === 'active';
    
    if ((isAdminByFlag || isAdminByTag) && isActive) {
      return { user, profile: unifiedProfile };
    }
  }
  
  // Fallback to profiles table for legacy compatibility
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single();
  
  if (!profileError && profile && (profile.role === 'admin' || profile.is_admin === true)) {
    return { user, profile };
  }
  
  return {
    error: 'Forbidden: Admin access required',
    status: 403
  };
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
export const handleServerError = (error: unknown, defaultMessage = 'Internal server error') => {
  console.error(`Server error: ${defaultMessage}`, error);

  let errorMessage = defaultMessage;
  let errorStatus = 500;

  // Check for Supabase PostgrestError (from database operations)
  if (error && typeof error === 'object') {
    if ('code' in error && 'message' in error && 'details' in error && 'hint' in error) {
      // This looks like a PostgrestError
      // We can provide more specific details if needed
      const pgError = error as { code: string; message: string; details: string; hint: string };
      errorMessage = pgError.message || defaultMessage;
      // You could map pgError.code to specific HTTP status codes if desired
      // For example, 'PGRST116' (not found) could be 404, '23505' (unique violation) could be 409
      // For now, we'll keep it as 500 for general server errors unless specified
      if (pgError.code === 'PGRST116') { // Not found
        errorStatus = 404;
        errorMessage = `${defaultMessage}: Resource not found. Details: ${pgError.details}`;
      } else if (pgError.code === '23503') { // Foreign key violation
        errorStatus = 409; // Conflict
        errorMessage = `${defaultMessage}: Conflict due to data integrity. Details: ${pgError.details}`;
      } else if (pgError.code === '23505') { // Unique violation
        errorStatus = 409; // Conflict
        errorMessage = `${defaultMessage}: Conflict, item already exists or unique constraint violated. Details: ${pgError.details}`;
      }
      // Add more specific Supabase error code mappings as needed
    } else if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      // General error object with a message property
      errorMessage = (error as { message: string }).message;
    }
  }


  return Response.json(
    { error: errorMessage },
    { status: errorStatus }
  );
}; 