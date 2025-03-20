import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type') || '';
  const redirectPath = requestUrl.searchParams.get('next') || '/dashboard';
  
  if (code) {
    const cookieStore = cookies();
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
            return;
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: -1 });
            return;
          },
        },
      }
    );
    
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);
    
    // Determine where to redirect based on the type of callback
    let redirectUrl = '/dashboard';
    
    if (type === 'recovery' || type === 'signup') {
      // If this is a password recovery or initial password setup, redirect to the setup account page
      redirectUrl = '/auth/setup-account';
    } else if (redirectPath) {
      // Otherwise, use the requested redirect path
      redirectUrl = redirectPath;
    }
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  
  // Default redirection if no code is provided
  return NextResponse.redirect(new URL('/auth/signin', request.url));
} 