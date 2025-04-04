import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  
  if (!code) {
    return NextResponse.redirect(new URL('/auth/signin', requestUrl.origin));
  }

  try {
    const supabase = await createRouteHandlerClient();
    
    // Always exchange the code for a session first, as per Supabase docs
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Auth callback error:', sessionError);
      return NextResponse.redirect(
        new URL(`/auth/signin?error=auth_callback_failed&message=${sessionError.message}`, requestUrl.origin)
      );
    }

    // For recovery flow, redirect to update password page
    if (type === 'recovery') {
      return NextResponse.redirect(
        new URL('/auth/update-password', requestUrl.origin)
      );
    }

    // For other flows, redirect to the intended destination
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(
      new URL('/auth/signin?error=auth_callback_failed', requestUrl.origin)
    );
  }
} 