import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // This will validate the session with the Supabase Auth server
  // Note: We can't use auth-coordination.ts here because middleware runs on the server
  // But we add a custom header to track refreshes
  const authRefreshHeader = request.headers.get('x-auth-refresh-timestamp');
  const skipRefresh = authRefreshHeader &&
    (Date.now() - parseInt(authRefreshHeader, 10) < 60000); // Skip if refreshed in last minute

  // Only refresh if needed
  const { data: { user }, error } = skipRefresh
    ? { data: { user: null }, error: null }
    : await supabase.auth.getUser()

  // If there's an error or no user, clear the session
  if (error || !user) {
    response.cookies.set({
      name: 'supabase-auth-token',
      value: '',
      maxAge: 0,
      path: '/',
    })
  }

  // Add auth refresh timestamp to response headers if we performed a refresh
  if (!skipRefresh) {
    response.headers.set('x-auth-refresh-timestamp', Date.now().toString());
  }

  // Check for special auth routes that shouldn't be redirected
  const isPasswordResetFlow = request.nextUrl.pathname.startsWith('/auth/update-password')

  // Handle protected routes
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                          request.nextUrl.pathname.startsWith('/admin')

  // Allow password reset flow even without authentication
  if (isPasswordResetFlow) {
    return response
  }

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  if (user && isAuthPage && !isPasswordResetFlow) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}