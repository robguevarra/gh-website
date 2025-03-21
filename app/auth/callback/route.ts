import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const type = requestUrl.searchParams.get('type') || '';
  const redirectPath = requestUrl.searchParams.get('next') || '/dashboard';
  
  console.log('Auth callback:', { type, hasCode: !!code, hasToken: !!token, params: Object.fromEntries(requestUrl.searchParams) });
  
  // Handle direct recovery redirects from Supabase's email links
  if (type === 'recovery' && token) {
    console.log('Direct recovery redirect with token detected');
    const updatePasswordUrl = new URL('/auth/update-password', request.url);
    updatePasswordUrl.searchParams.set('token', token);
    updatePasswordUrl.searchParams.set('type', 'recovery');
    return NextResponse.redirect(updatePasswordUrl);
  }
  
  if (code) {
    const cookieStore = cookies();
    
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/auth/signin?error=auth_callback_failed', request.url));
      }
      
      // Determine where to redirect based on the type of callback
      let redirectUrl = '/dashboard';
      
      if (type === 'recovery') {
        // If this is a password recovery, redirect to the update password page
        redirectUrl = '/auth/update-password';
        console.log('Redirecting to update password page');
      } else if (type === 'signup') {
        // If this is an initial password setup, redirect to the setup account page
        redirectUrl = '/auth/setup-account';
        console.log('Redirecting to setup account page');
      } else if (redirectPath) {
        // Otherwise, use the requested redirect path
        redirectUrl = redirectPath;
        console.log('Redirecting to', redirectPath);
      }
      
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    } catch (err) {
      console.error('Unexpected auth callback error:', err);
      return NextResponse.redirect(new URL('/auth/signin?error=unexpected', request.url));
    }
  }
  
  // Direct recovery redirect without code (fallback)
  if (type === 'recovery') {
    console.log('Recovery redirect without code, redirecting to update-password');
    return NextResponse.redirect(new URL('/auth/update-password', request.url));
  }
  
  // Default redirection if no code is provided
  console.log('No code or recovery type provided, redirecting to sign-in');
  return NextResponse.redirect(new URL('/auth/signin', request.url));
} 