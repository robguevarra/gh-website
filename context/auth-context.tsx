'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithProvider,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  getCurrentSession,
  AuthError
} from '@/lib/supabase/auth';
import { useUserProfile, useAdminStatus } from '@/lib/supabase/hooks';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

// Auth context type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithProvider: (provider: 'google' | 'facebook' | 'github') => Promise<{ error: AuthError | null }>;
  logout: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Auth provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the profile hook to fetch the user's profile
  const { data: profile, isLoading: isProfileLoading } = useUserProfile(user?.id);
  
  // Use the admin status hook
  const { data: adminData, isLoading: isAdminLoading } = useAdminStatus(user?.id);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Get current session
      const { session: currentSession } = await getCurrentSession();
      
      if (currentSession) {
        // Get current user
        const { user: currentUser } = await getCurrentUser();
        setUser(currentUser);
        setSession(currentSession);
      } else {
        setUser(null);
        setSession(null);
      }
      
      setIsLoading(false);
    };

    initializeAuth();

    // Set up auth state change listener
    const supabase = createBrowserSupabaseClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (currentSession) {
          setUser(currentSession.user);
          setSession(currentSession);
        } else {
          setUser(null);
          setSession(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
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
    isLoading: isLoading || isProfileLoading || isAdminLoading,
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