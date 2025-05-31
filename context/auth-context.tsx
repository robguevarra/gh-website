'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { User, Session } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/client';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithProvider,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  AuthError
} from '@/lib/supabase/auth';

// Get the singleton browser client instance
const supabase = getBrowserClient();

// Auth context type - SIMPLIFIED to only handle authentication
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithProvider: (provider: 'google' | 'facebook' | 'github') => Promise<{ error: AuthError | null }>;
  logout: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  supabase: SupabaseClient; // Expose Supabase client
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props type
type AuthProviderProps = {
  children: React.ReactNode;
};

// Auth provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Simple auth initialization - just get the current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session fetch error:', sessionError);
          if (mounted) {
            setUser(null);
            setSession(null);
          }
          return;
        }

        if (currentSession && mounted) {
          setUser(currentSession.user);
          setSession(currentSession);
        } else if (mounted) {
          setUser(null);
          setSession(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setIsAuthReady(true);
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state change:', event, currentSession ? 'session exists' : 'no session');
        
        if (currentSession && mounted) {
          // Use the user from the session directly instead of making another API call
          setUser(currentSession.user);
          setSession(currentSession);
        } else if (mounted) {
          // Clear both auth state and store when no session
          setUser(null);
          setSession(null);
        }

        setIsLoading(false);
      }
    );

    // Initialize auth
    initializeAuth();

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { user: signedInUser, session: newSession, error } = await signInWithEmail(email, password);

    if (!error && signedInUser && newSession) {
      setUser(signedInUser);
      setSession(newSession);

      // Simple redirect without additional database queries
      // The profile and admin status will be loaded by the hooks after redirect
      window.location.href = '/dashboard';
    }

    setIsLoading(false);
    return { error };
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    const { user: signedUpUser, session: newSession, error } = await signUpWithEmail(email, password);

    if (!error) {
      setUser(signedUpUser);
      setSession(newSession);
    }

    setIsLoading(false);
    return { error };
  };

  // Sign in with social provider
  const socialSignIn = async (provider: 'google' | 'facebook' | 'github') => {
    setIsLoading(true);
    const { error } = await signInWithProvider(provider);
    setIsLoading(false);
    return { error };
  };

  // Sign out
  const logout = async () => {
    setIsLoading(true);
    
    const { error } = await signOut();

    if (!error) {
      setUser(null);
      setSession(null);
      // Redirect to signin page after successful logout
      window.location.href = '/auth/signin';
    }

    setIsLoading(false);
    return { error };
  };

  // Reset password
  const handleResetPassword = async (email: string) => {
    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);
    return { error };
  };

  // Update password
  const handleUpdatePassword = async (password: string) => {
    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);
    return { error };
  };

  // Create value object
  const value = {
    user,
    session,
    isLoading: !isAuthReady || isLoading,
    isAuthReady,
    signIn,
    signUp,
    signInWithProvider: socialSignIn,
    logout,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    supabase, // Add supabase client to context value
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};