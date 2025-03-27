import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

// Create a single supabase client for server-side use with admin privileges
// This is different from the server.ts implementation which uses cookies
const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  
  return createClient<Database>(supabaseUrl, supabaseKey);
};

// Create a single supabase client for client-side use
const createBrowserSupabaseClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'supabase.auth.token',
      },
      cookies: {
        get(name) {
          if (typeof window === 'undefined') return '';
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          return parts.length === 2 ? parts.pop()?.split(';').shift() || '' : '';
        },
        set(name, value, options) {
          if (typeof window === 'undefined') return;
          let cookie = `${name}=${value}`;
          if (options?.path) cookie += `; path=${options.path}`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          if (options?.secure) cookie += '; secure';
          if (options?.sameSite) {
            cookie += `; samesite=${typeof options.sameSite === 'string' ? options.sameSite.toLowerCase() : options.sameSite}`;
          }
          document.cookie = cookie;
        },
        remove(name, options) {
          if (typeof window === 'undefined') return;
          document.cookie = `${name}=; max-age=-1; path=${options?.path || '/'}`;
        },
      }
    }
  );
};

export {
  createServerSupabaseClient,
  createBrowserSupabaseClient
}; 