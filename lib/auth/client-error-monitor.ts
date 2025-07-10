/**
 * Client-side Auth Error Monitor
 * 
 * Sends auth errors from the browser to the server-side monitoring system
 */

export interface ClientAuthErrorDetails {
  code: string;
  status: number;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  originalError?: any;
}

export interface ClientAuthErrorContext {
  url: string;
  component: string;
  userAgent?: string;
  timestamp?: string;
}

/**
 * Capture auth error from client-side and send to server monitoring
 */
export async function captureClientAuthError(
  errorType: string,
  message: string,
  details: ClientAuthErrorDetails,
  context: ClientAuthErrorContext
): Promise<void> {
  try {
    // Send in all environments since you're in launch mode and want to catch everything
    console.log('[ClientAuthError] Capturing:', { errorType, message, details, context });

    // Prepare the data for the server
    const errorData = {
      errorType,
      message,
      details: {
        ...details,
        userAgent: details.userAgent || navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
      context: {
        ...context,
        url: context.url || window.location.href,
        userAgent: context.userAgent || navigator.userAgent,
        timestamp: context.timestamp || new Date().toISOString(),
      },
    };

    // Send to our auth error monitoring endpoint
    await fetch('/api/auth/monitor-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
      // Use keepalive to ensure the error is sent even if the page is closing
      keepalive: true,
    });

  } catch (err) {
    // Don't throw errors from error monitoring to avoid infinite loops
    console.error('[ClientAuthError] Failed to send error to server:', err);
  }
}

/**
 * Map Supabase auth error codes to our monitoring error types
 */
export function mapSupabaseErrorToType(supabaseError: any): string {
  const code = supabaseError?.code || '';
  const message = supabaseError?.message || '';

  // Map common Supabase auth error codes
  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
    return 'login_failure';
  }
  if (code === 'email_not_confirmed' || message.includes('Email not confirmed')) {
    return 'account_not_verified';
  }
  if (code === 'signup_disabled' || message.includes('Signup is disabled')) {
    return 'signup_failure';
  }
  if (code === 'too_many_requests' || message.includes('too many')) {
    return 'rate_limit_exceeded';
  }
  if (code === 'weak_password' || message.includes('password')) {
    return 'validation_error';
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'signup_failure';
  }

  // Default to generic error types
  if (message.includes('network') || message.includes('connection')) {
    return 'provider_error';
  }

  return 'unknown_error';
}

/**
 * Determine error severity based on error type and context
 */
export function determineErrorSeverity(errorType: string, details: ClientAuthErrorDetails): string {
  // Critical errors
  if (errorType === 'provider_error' || errorType === 'database_error') {
    return 'critical';
  }

  // High severity errors
  if (errorType === 'rate_limit_exceeded' || details.status >= 500) {
    return 'high';
  }

  // Medium severity errors
  if (errorType === 'login_failure' || errorType === 'signup_failure') {
    return 'medium';
  }

  // Low severity errors (validation, user errors, etc.)
  return 'low';
} 