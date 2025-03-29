import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// Create a Supabase client for server components
export async function createServerSupabaseClient() {
  // In Next.js 15+, cookies() returns a Promise that must be awaited
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            // Use the correct method from ReadonlyRequestCookies
            cookieStore.set({
              name,
              value,
              ...options,
            });
          } catch (error) {
            // Handle cookie mutation error in static generation
          }
        },
        remove(name: string, options: any) {
          try {
            // Set empty value with maxAge 0 to remove
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            });
          } catch (error) {
            // Handle cookie mutation error in static generation
          }
        },
      },
    }
  );
}

// Create a Supabase client with service role for admin operations (bypasses RLS)
export async function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase service role credentials');
  }
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} 