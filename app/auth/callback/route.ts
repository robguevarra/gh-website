import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  
  if (code) {
    try {
      const supabase = await createRouteHandlerClient();
      
      // For recovery flow, pass the token to update password page
      if (type === 'recovery') {
        return NextResponse.redirect(
          new URL(`/auth/update-password?token=${code}&type=${type}`, requestUrl.origin)
        );
      }

      // For other flows, exchange the code for a session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        console.error('Auth callback error:', sessionError);
        return NextResponse.redirect(
          new URL(`/auth/signin?error=auth_callback_failed&message=${sessionError.message}`, requestUrl.origin)
        );
      }

      // Get the user to verify the session was created successfully
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User validation error:', userError);
        return NextResponse.redirect(
          new URL('/auth/signin?error=session_validation_failed', requestUrl.origin)
        );
      }

      // Successful authentication, redirect to the intended destination
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (error) {
      console.error('Unexpected error in auth callback:', error);
      return NextResponse.redirect(
        new URL('/auth/signin?error=auth_callback_failed', requestUrl.origin)
      );
    }
  }

  // No code present, redirect to sign in
  return NextResponse.redirect(new URL('/auth/signin', requestUrl.origin));
} 