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
import { logSessionActivity, SESSION_ACTIVITY_TYPES } from '@/lib/session/session-activity-logger';
import { getClientInfo } from '../lib/utils/client-info';

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
  
        
        if (currentSession && mounted) {
          // Use the user from the session directly instead of making another API call
          setUser(currentSession.user);
          setSession(currentSession);
          
          // Log session refresh events
          if (event === 'TOKEN_REFRESHED') {
            try {
              const { userAgent } = getClientInfo();
              console.log('Logging session refresh for user:', currentSession.user.id);
              await logSessionActivity({
                userId: currentSession.user.id,
                activityType: SESSION_ACTIVITY_TYPES.REFRESH,
                sessionId: currentSession.access_token || 'unknown',
                userAgent,
                metadata: {
                  method: 'auto',
                  platform: 'web'
                }
              });
              console.log('Session refresh activity logged successfully');
            } catch (logError) {
              console.error('Failed to log session refresh activity:', logError);
            }
          }
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
    let signInResult;
    
    try {
      signInResult = await signInWithEmail(email, password);
      
      // If there's an error, return early
      if (signInResult.error) {
        console.error('Authentication error:', signInResult.error);
        setIsLoading(false);
        return { error: signInResult.error };
      }
      
      // Ensure we have a valid user and session
      if (!signInResult.user || !signInResult.session) {
        console.error('Missing user or session after successful authentication');
        setIsLoading(false);
        return { 
          error: { 
            message: 'Authentication succeeded but session was not established properly. Please try again.', 
            code: 'session_establishment_failed' 
          } 
        };
      }
      
      // Verify session is valid by making a test request
      try {
        const { data: sessionTest, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionTest.session) {
          console.error('Session verification failed:', sessionError);
          setIsLoading(false);
          return { 
            error: { 
              message: 'Your session could not be verified. Please try again.', 
              code: 'session_verification_failed' 
            } 
          };
        }
        
        // Session is valid, proceed with updating context
        console.log('Session verified successfully');
      } catch (sessionVerifyError) {
        console.error('Error verifying session:', sessionVerifyError);
        setIsLoading(false);
        return { 
          error: { 
            message: 'An error occurred while verifying your session. Please try again.', 
            code: 'session_verification_error' 
          } 
        };
      }
      
      // Log the login activity
      try {
        const { userAgent } = getClientInfo();
        console.log('Logging login activity for user:', signInResult.user.id);
        await logSessionActivity({
          userId: signInResult.user.id,
          activityType: SESSION_ACTIVITY_TYPES.LOGIN,
          sessionId: signInResult.session?.access_token || 'unknown',
          userAgent,
          metadata: {
            method: 'email',
            platform: 'web'
          }
        });
        console.log('Login activity logged successfully');
      } catch (logError) {
        // Non-fatal error, just log it
        console.error('Failed to log login activity:', logError);
      }

      // Update user and session in context
      setUser(signInResult.user);
      setSession(signInResult.session);
      
      // Let the component handle redirection
      // This prevents race conditions with session establishment
    } catch (unexpectedError) {
      console.error('Unexpected error during sign-in process:', unexpectedError);
      setIsLoading(false);
      return { 
        error: { 
          message: 'An unexpected error occurred during sign-in. Please try again.', 
          code: 'unexpected_signin_error' 
        } 
      };
    }

    setIsLoading(false);
    return { error: null };
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
    
    // Capture user ID before logout for logging purposes
    const currentUserId = user?.id;
    const currentSessionId = session?.access_token;
    
    const { error } = await signOut();

    if (!error) {
      // Log the logout activity
      if (currentUserId) {
        try {
          const { userAgent } = getClientInfo();
          console.log('Logging logout activity for user:', currentUserId);
          await logSessionActivity({
            userId: currentUserId,
            activityType: SESSION_ACTIVITY_TYPES.LOGOUT,
            sessionId: currentSessionId || 'unknown',
            userAgent,
            metadata: {
              method: 'manual',
              platform: 'web'
            }
          });
          console.log('Logout activity logged successfully');
        } catch (logError) {
          console.error('Failed to log logout activity:', logError);
        }
      }
      
      // Update state
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