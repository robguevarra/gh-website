'use client';

import { getBrowserClient } from './client';
import type { Provider } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

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
    const supabase = getClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, error: { message: error.message, code: error.code } };
    }

    // Validate the user with the server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        user: null, 
        session: null, 
        error: userError ? 
          { message: userError.message, code: userError.code } : 
          { message: 'User validation failed', code: 'validation_error' } 
      };
    }

    return { user, session: data.session, error: null };
  } catch (err) {
    console.error('Sign in error:', err);
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