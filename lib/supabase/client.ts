import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

// Create a single supabase client for server-side use with admin privileges
// This is different from the server.ts implementation which uses cookies
const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
};

// Create a single supabase client for client-side use
const createBrowserSupabaseClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: {
          // Use localStorage for session persistence
          getItem: (key: string): string | null => {
            if (typeof window === 'undefined') return null;
            return window.localStorage.getItem(key);
          },
          setItem: (key: string, value: string): void => {
            if (typeof window === 'undefined') return;
            window.localStorage.setItem(key, value);
          },
          removeItem: (key: string): void => {
            if (typeof window === 'undefined') return;
            window.localStorage.removeItem(key);
          },
        }
      },
      global: {
        fetch: fetch.bind(globalThis)
      }
    }
  );
};

// Export a singleton instance for the browser
let browserClient: ReturnType<typeof createBrowserSupabaseClient>;

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  return browserClient;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const createClient = () =>
  createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
    },
  })

export {
  createServerSupabaseClient,
  createBrowserSupabaseClient
}; 