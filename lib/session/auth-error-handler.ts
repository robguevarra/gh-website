'use client';

import { AuthError } from '@supabase/supabase-js';

// Define more specific error types for better handling
export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

// Extended error interface with additional metadata
export interface AuthErrorWithMetadata {
  code: AuthErrorCode;
  message: string;
  userMessage: string;
  recoverySteps?: string[];
  metadata?: Record<string, any>;
  original?: any;
  status?: number;
  details?: string;
  recoverable: boolean;
  redirect?: string;
  retryable: boolean;
  hint?: string;
}

// Define common error codes from Supabase Auth and custom ones
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  INVALID_EMAIL: 'invalid_email',
  USER_NOT_FOUND: 'user_not_found',
  ALREADY_REGISTERED: 'already_registered',
  WEAK_PASSWORD: 'weak_password',
  EXPIRED_TOKEN: 'expired_token',
  INVALID_TOKEN: 'invalid_token',
  SESSION_EXPIRED: 'session_expired',
  NO_SESSION: 'no_session',
  NETWORK_ERROR: 'network_error',
  RATE_LIMITED: 'rate_limited',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SERVER_ERROR: 'server_error',
  UNKNOWN_ERROR: 'unknown_error',
} as const;

// Map Supabase error codes to our standardized codes
const errorCodeMap: Record<string, AuthErrorCode> = {
  'auth/invalid-email': AUTH_ERROR_CODES.INVALID_EMAIL,
  'auth/user-not-found': AUTH_ERROR_CODES.USER_NOT_FOUND,
  'auth/wrong-password': AUTH_ERROR_CODES.INVALID_CREDENTIALS,
  'auth/email-already-in-use': AUTH_ERROR_CODES.ALREADY_REGISTERED,
  'auth/weak-password': AUTH_ERROR_CODES.WEAK_PASSWORD,
  'auth/invalid-credential': AUTH_ERROR_CODES.INVALID_CREDENTIALS,
  'auth/expired-action-code': AUTH_ERROR_CODES.EXPIRED_TOKEN,
  'auth/invalid-action-code': AUTH_ERROR_CODES.INVALID_TOKEN,
  'auth/too-many-requests': AUTH_ERROR_CODES.RATE_LIMITED,
  'auth/network-request-failed': AUTH_ERROR_CODES.NETWORK_ERROR,
  // Supabase specific codes
  'invalid_grant': AUTH_ERROR_CODES.INVALID_CREDENTIALS,
  'invalid_email': AUTH_ERROR_CODES.INVALID_EMAIL,
  'email_not_found': AUTH_ERROR_CODES.USER_NOT_FOUND,
  'email_taken': AUTH_ERROR_CODES.ALREADY_REGISTERED,
  'email_confirmation_required': AUTH_ERROR_CODES.INVALID_TOKEN,
  'expired_token': AUTH_ERROR_CODES.EXPIRED_TOKEN,
  'password_recovery_expired': AUTH_ERROR_CODES.EXPIRED_TOKEN,
};

// Define which errors are recoverable/retryable
const recoverableErrors: AuthErrorCode[] = [
  AUTH_ERROR_CODES.INVALID_CREDENTIALS,
  AUTH_ERROR_CODES.WEAK_PASSWORD,
  AUTH_ERROR_CODES.INVALID_EMAIL,
  AUTH_ERROR_CODES.SESSION_EXPIRED,
  AUTH_ERROR_CODES.NETWORK_ERROR,
  AUTH_ERROR_CODES.RATE_LIMITED,
  AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED
];

// Define explicitly which errors can be retried
const retryableErrorCodes: AuthErrorCode[] = [
  AUTH_ERROR_CODES.NETWORK_ERROR,
  AUTH_ERROR_CODES.SERVER_ERROR,
  AUTH_ERROR_CODES.RATE_LIMITED,
  AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED
];

/**
 * Get a user-friendly error message based on error code
 */
export function getUserFriendlyAuthErrorMessage(code: AuthErrorCode): string {
  switch (code) {
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
      return 'The email or password you entered is incorrect. Please try again.';
    case AUTH_ERROR_CODES.INVALID_EMAIL:
      return 'Please enter a valid email address.';
    case AUTH_ERROR_CODES.USER_NOT_FOUND:
      return 'We couldn\'t find an account with that email. Please check and try again.';
    case AUTH_ERROR_CODES.ALREADY_REGISTERED:
      return 'An account with this email already exists. Please sign in instead.';
    case AUTH_ERROR_CODES.WEAK_PASSWORD:
      return 'Your password must be at least 8 characters and include a number and a special character.';
    case AUTH_ERROR_CODES.EXPIRED_TOKEN:
      return 'This link has expired. Please request a new one.';
    case AUTH_ERROR_CODES.INVALID_TOKEN:
      return 'This link is invalid or has already been used.';
    case AUTH_ERROR_CODES.SESSION_EXPIRED:
      return 'Your session has expired. Please sign in again.';
    case AUTH_ERROR_CODES.NO_SESSION:
      return 'You\'re not signed in. Please sign in to continue.';
    case AUTH_ERROR_CODES.RATE_LIMITED:
      return 'Too many attempts. Please wait a few minutes before trying again.';
    case AUTH_ERROR_CODES.NETWORK_ERROR:
      return 'Connection error. Please check your internet connection and try again.';
    case AUTH_ERROR_CODES.SERVER_ERROR:
      return 'There was a problem with our server. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Get recovery steps for an error
 */
export function getRecoverySteps(code: AuthErrorCode): string[] {
  switch (code) {
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
      return [
        "Double-check your email address for typos",
        "Make sure your password is correct", 
        "Use the 'Forgot Password' link if needed"
      ];
    case AUTH_ERROR_CODES.USER_NOT_FOUND:
      return ["Verify the email address", "Consider creating a new account"];
    case AUTH_ERROR_CODES.SESSION_EXPIRED:
      return ["Sign in again to continue where you left off"];
    case AUTH_ERROR_CODES.RATE_LIMITED:
    case AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED:
      return ["Wait a few minutes before trying again", "Contact support if this continues"];
    case AUTH_ERROR_CODES.NETWORK_ERROR:
      return ["Check your internet connection", "Refresh the page and try again"];
    default:
      return [];
  }
}

/**
 * Get instructions for recovering from an error
 */
export function getErrorRecoveryInstructions(code: AuthErrorCode): string {
  switch (code) {
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
      return 'Double-check your email and password. If you forgot your password, use the "Forgot Password" link.';
    case AUTH_ERROR_CODES.USER_NOT_FOUND:
      return 'If you\'re new, consider signing up for an account.';
    case AUTH_ERROR_CODES.ALREADY_REGISTERED:
      return 'Try signing in with this email instead or use the "Forgot Password" option if you can\'t remember your password.';
    case AUTH_ERROR_CODES.EXPIRED_TOKEN:
    case AUTH_ERROR_CODES.INVALID_TOKEN:
      return 'Please request a new link to continue.';
    case AUTH_ERROR_CODES.SESSION_EXPIRED:
      return 'Please sign in again to continue where you left off.';
    case AUTH_ERROR_CODES.RATE_LIMITED:
      return 'Please wait a few minutes before trying again.';
    case AUTH_ERROR_CODES.NETWORK_ERROR:
      return 'Check your internet connection, then try again.';
    default:
      return '';
  }
}

/**
 * Standardize error format from different sources
 */
export function normalizeAuthError(error: any): AuthErrorWithMetadata {
  // If it's already our format, return as is
  if (error && 'code' in error && 'message' in error && 'userMessage' in error && 'recoverable' in error) {
    return error as AuthErrorWithMetadata;
  }
  
  // Default to unknown error
  let code: AuthErrorCode = AUTH_ERROR_CODES.UNKNOWN_ERROR;
  let message = 'An unexpected error occurred';
  let details = '';
  let status = undefined;
  
  // Handle Supabase AuthError
  if (error && typeof error === 'object') {
    if ('code' in error && typeof error.code === 'string') {
      // Map Supabase error code to our standardized code if it exists in the map
      const mappedCode = errorCodeMap[error.code];
      if (mappedCode && Object.values(AUTH_ERROR_CODES).includes(mappedCode)) {
        code = mappedCode as AuthErrorCode;
      }
    }
    
    if ('message' in error && typeof error.message === 'string') {
      message = error.message;
    }
    
    if ('status' in error && typeof error.status === 'number') {
      status = error.status;
    }
    
    if ('details' in error && typeof error.details === 'string') {
      details = error.details;
    }
  }
  // Handle string errors
  else if (typeof error === 'string') {
    message = error;
  }
  
  // Session errors
  if (message.includes('session expired') || message.includes('not authenticated')) {
    code = AUTH_ERROR_CODES.SESSION_EXPIRED;
  }
  
  // Network errors
  if (message.includes('network') || message.includes('connection')) {
    code = AUTH_ERROR_CODES.NETWORK_ERROR;
  }
  
  // Ensure code is a valid AuthErrorCode
  const validatedCode = Object.values(AUTH_ERROR_CODES).includes(code as any) 
    ? code as AuthErrorCode 
    : AUTH_ERROR_CODES.UNKNOWN_ERROR;
    
  // Get user-friendly message
  const userFriendlyMessage = getUserFriendlyAuthErrorMessage(validatedCode);
  const recoverySteps = getRecoverySteps(validatedCode);
  
  return {
    code: validatedCode, // Use the validated code
    message, // Technical message
    userMessage: userFriendlyMessage, // User-friendly message
    details: details || message, // Original error message as details
    status,
    recoverySteps, // Added recovery steps
    recoverable: recoverableErrors.includes(validatedCode),
    retryable: retryableErrorCodes.includes(validatedCode),
    hint: getErrorRecoveryInstructions(validatedCode),
    redirect: validatedCode === AUTH_ERROR_CODES.SESSION_EXPIRED ? '/auth/signin' : undefined,
  };
}

/**
 * Log authentication errors for security monitoring
 */
export function logAuthError(error: AuthErrorWithMetadata, context?: Record<string, any>): void {
  // In development, just log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Auth Error:', { error, context });
    return;
  }
  
  // In production, send to logging endpoint
  try {
    const logData = {
      eventType: 'auth_error',
      error: {
        code: error.code,
        message: error.message,
        status: error.status,
      },
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
    };
    
    fetch('/api/security/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
      // Use keepalive to ensure log is sent even during navigation
      keepalive: true,
    }).catch(err => console.error('Failed to log auth error:', err));
  } catch (e) {
    // Silent failure for logging - shouldn't impact user experience
    console.error('Failed to log auth error:', e);
  }
}

/**
 * Handle authentication errors with consistent patterns
 * Returns standardized error, logs it, and performs recommended actions
 */
export function handleAuthError(
  error: any, 
  context?: Record<string, any>,
  onError?: (error: AuthErrorWithMetadata) => void
): AuthErrorWithMetadata {
  // Normalize error format
  const normalizedError = normalizeAuthError(error);
  
  // Log the error
  logAuthError(normalizedError, context);
  
  // Call error callback if provided
  if (onError) {
    onError(normalizedError);
  }
  
  // Perform automatic actions based on error type
  if (normalizedError.redirect && typeof window !== 'undefined') {
    // For critical auth errors like session expiry, redirect to sign in
    if (normalizedError.code === AUTH_ERROR_CODES.SESSION_EXPIRED) {
      // Use setTimeout to ensure this happens after current execution
      setTimeout(() => {
        window.location.href = normalizedError.redirect as string;
      }, 0);
    }
  }
  
  return normalizedError;
}

/**
 * Decorator for adding retry capability to auth functions
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    maxRetries?: number;
    delayMs?: number;
    retryableErrors?: AuthErrorCode[];
    onRetry?: (error: AuthErrorWithMetadata, attempt: number) => void;
  } = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    retryableErrors = retryableErrorCodes, // Default to our predefined list
    onRetry = () => {},
  } = options;
  
  return async function(...args: Parameters<T>): Promise<ReturnType<T>> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        const normalizedError = normalizeAuthError(error);
        
        // Only retry for retryable errors
        if (!normalizedError.retryable || 
            !retryableErrors.includes(normalizedError.code)) {
          break;
        }
        
        // Call onRetry callback
        onRetry(normalizedError, attempt + 1);
        
        // Wait before next retry with exponential backoff
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, delayMs * Math.pow(2, attempt))
          );
        }
      }
    }
    
    // If we got here, all retries failed
    throw lastError;
  };
}
