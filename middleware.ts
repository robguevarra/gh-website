import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { defaultSecurityMiddleware, applyRateLimiting, applyWebhookSecurityHeaders } from '@/lib/security'
import { AUTH_ERROR_CODES } from '@/lib/session/auth-error-handler'

export async function middleware(request: NextRequest) {
  // Create the initial response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  // Skip security middleware for webhook endpoints (they need to accept external requests)
  const isWebhookEndpoint = request.nextUrl.pathname.startsWith('/api/webhooks/') ||
                           request.nextUrl.pathname.startsWith('/api/cron/')
  
  if (!isWebhookEndpoint) {
    // Apply security middleware early to set security headers
    response = await defaultSecurityMiddleware(request, response)
  } else {
    // For webhooks, apply minimal security headers without CSRF protection
    response = applyWebhookSecurityHeaders(request, response)
  }

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
  
  // Apply rate limiting to authentication endpoints
  const isLoginRoute = request.nextUrl.pathname.startsWith('/auth/signin') || 
                      request.nextUrl.pathname.startsWith('/api/auth/login')
  const isSignupRoute = request.nextUrl.pathname.startsWith('/auth/signup') || 
                       request.nextUrl.pathname.startsWith('/api/auth/signup')
  const isPasswordResetRoute = request.nextUrl.pathname.startsWith('/auth/reset-password') || 
                              request.nextUrl.pathname.startsWith('/api/auth/reset-password')
  
  // Apply appropriate rate limiting based on the route
  if (isLoginRoute && request.method !== 'GET') {
    response = await applyRateLimiting(request, response, 'login')
  } else if (isSignupRoute && request.method !== 'GET') {
    response = await applyRateLimiting(request, response, 'signup')
  } else if (isPasswordResetRoute && request.method !== 'GET') {
    response = await applyRateLimiting(request, response, 'passwordReset')
  }

  // Handle protected routes
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isAffiliatePortalRoute = request.nextUrl.pathname.startsWith('/affiliate-portal')
  const isProtectedRoute = isDashboardRoute || isAdminRoute || isAffiliatePortalRoute

  // Allow password reset flow even without authentication
  if (isPasswordResetFlow) {
    return response
  }

  // Redirect unauthenticated users from protected routes to sign-in
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // For authenticated users, check role access and redirect appropriately
  if (user) {
    // Fetch user profile once for all checks
    try {
      const { data: profile, error: profileError } = await supabase
        .from('unified_profiles')
        .select('is_student, is_affiliate, is_admin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error(`Middleware: Error fetching profile for user ${user.id}.`, profileError);
        // Allow the request to proceed with default access (will be handled by UI)
        return response;
      }

      // If profile exists, use it for all permission checks
      if (profile) {
        // CASE 1: Auth pages - redirect to appropriate dashboard based on role priority
        if (isAuthPage && !isPasswordResetFlow) {
          // Role-based redirection priority: Admin > Affiliate > Student
          if (profile.is_admin) {
            return NextResponse.redirect(new URL('/admin', request.url));
          }
          if (profile.is_affiliate) {
            return NextResponse.redirect(new URL('/affiliate-portal', request.url));
          }
          if (profile.is_student) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
          // Fallback if no specific role flag is true but user is authenticated
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // CASE 2: Access control for protected routes based on user roles
        // Admin routes - only accessible to admins
        if (isAdminRoute && !profile.is_admin) {
          console.log(`Middleware: Non-admin user ${user.id} attempted to access admin route`);
          // Redirect to appropriate route based on highest role
          if (profile.is_affiliate) {
            return NextResponse.redirect(new URL('/affiliate-portal', request.url));
          }
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // Affiliate portal routes - only accessible to affiliates
        if (isAffiliatePortalRoute && !profile.is_affiliate) {
          console.log(`Middleware: Non-affiliate user ${user.id} attempted to access affiliate portal`);
          // Redirect to appropriate route based on highest role
          if (profile.is_admin) {
            return NextResponse.redirect(new URL('/admin', request.url));
          }
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // Dashboard routes - only accessible to students
        if (isDashboardRoute && !profile.is_student && (profile.is_affiliate || profile.is_admin)) {
          console.log(`Middleware: Non-student user ${user.id} attempted to access dashboard`);
          // Redirect to appropriate route based on highest role
          if (profile.is_admin) {
            return NextResponse.redirect(new URL('/admin', request.url));
          }
          if (profile.is_affiliate) {
            return NextResponse.redirect(new URL('/affiliate-portal', request.url));
          }
        }
      }
    } catch (e) {
      console.error('Middleware: Unexpected error during profile fetch for access control.', e);
      // Allow the request to proceed on error (access will be controlled by UI)
      return response;
    }
  }

  // Apply session security headers to response
  const sessionExpiryTime = user ? Math.floor(Date.now() / 1000) + 3600 : 0; // 1 hour from now or 0 if no user
  response.headers.set('x-session-expiry', sessionExpiryTime.toString());
  
  // Add session activity timestamp to track user activity
  response.headers.set('x-session-activity', Date.now().toString());
  
  // Add auth status header for client components to detect auth state changes
  response.headers.set('x-auth-status', user ? 'authenticated' : 'unauthenticated');
  
  // Apply any final security measures before returning the response
  return response
}

/**
 * Helper function to update the session
 * This is extracted from the middleware for reuse
 */
export async function updateSession(request: NextRequest) {
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

  // This will refresh session if expired - required for Server Components
  // It makes an API request to Supabase to validate the session
  await supabase.auth.getUser()

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