'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
import { useUserProfile, useAdminStatus } from '@/lib/supabase/hooks';

// Get the singleton browser client instance
const supabase = getBrowserClient();

// Auth context type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthReady: boolean; // New flag to indicate when auth is initialized
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithProvider: (provider: 'google' | 'facebook' | 'github') => Promise<{ error: AuthError | null }>;
  logout: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
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
  
  // Use the profile hook to fetch the user's profile
  const { data: profile, isLoading: isProfileLoading } = useUserProfile(user?.id);
  
  // Use the admin status hook
  const { data: adminData, isLoading: isAdminLoading } = useAdminStatus(user?.id);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Get current user - this is secure as it validates with the Supabase server
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('User fetch error:', userError);
          if (mounted) {
            setUser(null);
            setSession(null);
          }
          return;
        }
        
        if (currentUser && mounted) {
          console.log('Auth initialized with user:', { 
            userId: currentUser?.id,
            email: currentUser?.email
          });
          setUser(currentUser);
        } else if (mounted) {
          console.log('No active user found during initialization');
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
        console.log('Auth state change:', { 
          event, 
          userId: currentSession?.user?.id
        });
        
        if (currentSession && mounted) {
          // Validate the user with the server on auth state change
          const { data: { user: validatedUser }, error: validationError } = 
            await supabase.auth.getUser();
            
          if (validationError) {
            console.error('User validation error:', validationError);
            setUser(null);
            setSession(null);
            return;
          }
          
          if (validatedUser) {
            setUser(validatedUser);
            setSession(currentSession);
          }
        } else if (mounted) {
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
    
    if (!error) {
      setUser(signedInUser);
      setSession(newSession);
      
      // Wait for admin status to be loaded
      const { data: adminData } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', signedInUser.id)
        .single();
      
      // Redirect based on admin status
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
    profile,
    isAdmin: adminData?.isAdmin || false,
    isLoading: !isAuthReady || isLoading || isProfileLoading || isAdminLoading,
    isAuthReady,
    signIn,
    signUp,
    signInWithProvider: socialSignIn,
    logout,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
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