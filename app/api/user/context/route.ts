import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase'; // Assuming supabase types are in 'types/supabase.ts'

export const runtime = 'edge'; // Enable Edge Runtime for lower latency and cost

export async function GET(request: Request) {
  // Ensure environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('User context API: Supabase URL or Anon Key is missing from environment variables.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        async get(name: string) {
          const currentCookieStore = await cookies();
          return currentCookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          const currentCookieStore = await cookies();
          try {
            currentCookieStore.set(name, value, options);
          } catch (error) {
            console.warn(`User context API: Could not set cookie '${name}' in GET handler. This might indicate an attempt to set a cookie in a read-only context or an issue with session refresh.`, error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          const currentCookieStore = await cookies();
          try {
            currentCookieStore.set(name, '', { ...options, maxAge: -1 });
          } catch (error) {
            console.warn(`User context API: Could not remove cookie '${name}' in GET handler. This might indicate an attempt to remove a cookie in a read-only context or an issue with session refresh.`, error);
          }
        },
      },
    }
  );

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('User context API: Auth error or no user', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('unified_profiles')
      .select('id, email, is_student, is_affiliate, is_admin, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('User context API: Profile error', profileError);
      if (profileError.code === 'PGRST116') { // PGRST116: Searched for a single row, but 0 rows were found
        return NextResponse.json({ error: 'Profile not found for user.' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile) {
      // This case should ideally be covered by profileError.code === 'PGRST116'
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const responsePayload = {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      isStudent: profile.is_student,
      isAffiliate: profile.is_affiliate,
      isAdmin: profile.is_admin,
    };
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('User context API: Unexpected error', error);
    // It's good practice to avoid sending detailed internal error messages to the client.
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}

// Ensure dynamic behavior, no caching for this user-specific route
export const dynamic = 'force-dynamic';
