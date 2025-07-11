'use client';

import { getBrowserClient } from './client';
import type { Provider } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { captureClientAuthError, mapSupabaseErrorToType, determineErrorSeverity } from '@/lib/auth/client-error-monitor';

// Define auth error types
export type AuthError = {
  message: string;
  code?: string;
};

// Use the singleton browser client instance
const getClient = () => getBrowserClient();

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  try {
    // Get a fresh client instance to avoid stale state
    const supabase = getClient();
    
    // Clear any existing session first to avoid conflicts
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        console.warn('Error clearing previous session:', signOutError);
        // Continue with sign-in attempt anyway
      }
    } catch (signOutErr) {
      console.warn('Exception during session cleanup:', signOutErr);
      // Continue with sign-in attempt
    }
    
    // Attempt to sign in
    console.log('Attempting sign-in for email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase auth error during sign-in:', error);
      
      // Capture signin error for monitoring
      const errorType = mapSupabaseErrorToType(error);
      const errorDetails = {
        code: error.code || 'SIGNIN_FAILED',
        status: 401,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        originalError: error,
      };
      
      await captureClientAuthError(
        errorType,
        error.message,
        errorDetails,
        {
          url: typeof window !== 'undefined' ? window.location.href : '',
          component: 'SignInWithEmail',
        }
      ).catch(err => console.error('Failed to capture signin error:', err));
      
      return { user: null, session: null, error: { message: error.message, code: error.code } };
    }
    
    if (!data.session || !data.user) {
      console.error('Sign-in succeeded but session or user is missing');
      
      const errorDetails = {
        code: 'SESSION_MISSING',
        status: 401,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };
      
      await captureClientAuthError(
        'session_invalid',
        'Authentication succeeded but session was not established',
        errorDetails,
        {
          url: typeof window !== 'undefined' ? window.location.href : '',
          component: 'SignInWithEmail_SessionMissing',
        }
      ).catch(err => console.error('Failed to capture session missing error:', err));
      
      return { 
        user: null, 
        session: null, 
        error: { 
          message: 'Authentication succeeded but session was not established', 
          code: 'session_missing' 
        } 
      };
    }

    // Verify the session is valid with an explicit check
    try {
      console.log('Verifying session after sign-in');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session verification failed:', sessionError);
        
        const errorDetails = {
          code: sessionError.code || 'SESSION_VERIFICATION_FAILED',
          status: 401,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          originalError: sessionError,
        };
        
        await captureClientAuthError(
          'session_invalid',
          sessionError.message,
          errorDetails,
          {
            url: typeof window !== 'undefined' ? window.location.href : '',
            component: 'SignInWithEmail_SessionVerification',
          }
        ).catch(err => console.error('Failed to capture session verification error:', err));
        
        return { 
          user: null, 
          session: null, 
          error: { 
            message: 'Your session could not be verified after login', 
            code: 'session_verification_failed' 
          } 
        };
      }
      
      if (!sessionData.session) {
        console.error('Session verification returned no session');
        
        const errorDetails = {
          code: 'SESSION_VERIFICATION_EMPTY',
          status: 401,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        };
        
        await captureClientAuthError(
          'session_invalid',
          'Session verification returned no session',
          errorDetails,
          {
            url: typeof window !== 'undefined' ? window.location.href : '',
            component: 'SignInWithEmail_EmptySession',
          }
        ).catch(err => console.error('Failed to capture empty session error:', err));
        
        return { 
          user: null, 
          session: null, 
          error: { 
            message: 'Your session could not be verified after login', 
            code: 'empty_session' 
          } 
        };
      }
      
      console.log('Session verified successfully');
    } catch (sessionVerifyErr) {
      console.error('Exception during session verification:', sessionVerifyErr);
      
      const errorDetails = {
        code: 'SESSION_VERIFICATION_EXCEPTION',
        status: 500,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        originalError: sessionVerifyErr,
      };
      
      await captureClientAuthError(
        'unknown_error',
        sessionVerifyErr instanceof Error ? sessionVerifyErr.message : 'Unknown error during session verification',
        errorDetails,
        {
          url: typeof window !== 'undefined' ? window.location.href : '',
          component: 'SignInWithEmail_SessionVerificationException',
        }
      ).catch(err => console.error('Failed to capture session verification exception:', err));
      
      return { 
        user: null, 
        session: null, 
        error: { 
          message: 'An error occurred while verifying your session', 
          code: 'session_verification_error' 
        } 
      };
    }

    console.log('Sign-in successful, returning user and session');
    return { user: data.user, session: data.session, error: null };
  } catch (err) {
    console.error('Unhandled exception during sign-in process:', err);
    
    // Capture unexpected signin error for monitoring
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    const errorDetails = {
      code: 'UNEXPECTED_SIGNIN_ERROR',
      status: 500,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      originalError: err,
    };
    
    await captureClientAuthError(
      'unknown_error',
      errorMessage,
      errorDetails,
      {
        url: typeof window !== 'undefined' ? window.location.href : '',
        component: 'SignInWithEmail_Catch',
      }
    ).catch(captureErr => console.error('Failed to capture unexpected signin error:', captureErr));
    
    return { 
      user: null, 
      session: null, 
      error: { 
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        code: 'unexpected_error'
      }
    };
  }
}

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      // Capture signup error for monitoring
      const errorType = mapSupabaseErrorToType(error);
      const errorDetails = {
        code: error.code || 'SIGNUP_FAILED',
        status: 400,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        originalError: error,
      };
      
      captureClientAuthError(
        errorType,
        error.message,
        errorDetails,
        {
          url: typeof window !== 'undefined' ? window.location.href : '',
          component: 'SignUpWithEmail',
        }
      ).catch(err => console.error('Failed to capture signup error:', err));
      
      return { user: null, session: null, error: { message: error.message, code: error.code } };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err) {
    console.error('Sign up error:', err);
    return { 
      user: null, 
      session: null, 
      error: { 
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        code: 'unexpected_error'
      }
    };
  }
}

// Sign in with social provider
export async function signInWithProvider(provider: Provider) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err) {
    console.error('Social sign in error:', err);
    return { 
      error: { 
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        code: 'unexpected_error'
      }
    };
  }
}

// Sign out
export async function signOut() {
  try {
    const supabase = getClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err) {
    console.error('Sign out error:', err);
    return { 
      error: { 
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        code: 'unexpected_error'
      }
    };
  }
}

// Reset password
export async function resetPassword(email: string) {
  try {
    const supabase = getClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err) {
    console.error('Reset password error:', err);
    return { 
      error: { 
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        code: 'unexpected_error'
      }
    };
  }
}

// Update password
export async function updatePassword(password: string) {
  try {
    const supabase = getClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err) {
    console.error('Update password error:', err);
    return { 
      error: { 
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        code: 'unexpected_error'
      }
    };
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const supabase = getClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return { user: null, error: { message: error.message, code: error.code } };
    }

    return { user, error: null };
  } catch (err) {
    console.error('Get current user error:', err);
    return { 
      user: null, 
      error: { 
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        code: 'unexpected_error'
      }
    };
  }
}

// Create a React Auth Context hook in a separate file
// This is just a utility function file 