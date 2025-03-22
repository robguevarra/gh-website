import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for use in route handlers with proper cookie handling
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  
  // Debug cookie access
  console.log('Route handler cookies:', {
    cookieCount: Array.from(cookieStore.getAll()).length,
    hasSbAuthCookie: !!cookieStore.get('sb-access-token')?.value,
    hasRefreshCookie: !!cookieStore.get('sb-refresh-token')?.value
  });
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name)?.value;
          console.log(`Getting cookie: ${name}, exists: ${!!cookie}`);
          return cookie;
        },
        set(name, value, options) {
          // In route handlers, we can set cookies but they will only be applied
          // if returned in the response headers
          console.log(`Setting cookie: ${name}`);
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          console.log(`Removing cookie: ${name}`);
          cookieStore.delete(name);
        },
      },
    }
  );
} 