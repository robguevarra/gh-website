'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { User, Session } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { toast } from 'sonner';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithProvider,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  AuthError,
} from '@/lib/supabase/auth';
import { 
  getSessionManager, 
  SessionManager, 
  EnhancedSession, 
  UserRole 
} from '@/lib/session/session-manager';
import { 
  handleAuthError, 
  normalizeAuthError,
  AUTH_ERROR_CODES, 
  AuthErrorWithMetadata 
} from '@/lib/session/auth-error-handler';
import { SessionTimeoutAlert } from '@/components/auth/session-timeout-alert';
import {
  logSessionActivity,
  getClientInfo,
  SESSION_ACTIVITY_TYPES,
  SessionActivityMetadata
} from '@/lib/session/session-activity-logger';

// Get the singleton browser client instance
const supabase = getBrowserClient();

// Enhanced Auth context type with role and session management
type EnhancedAuthContextType = {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  isLoading: boolean;
  isAuthReady: boolean;
  hasRole: (role: UserRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthErrorWithMetadata | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthErrorWithMetadata | null }>;
  signInWithProvider: (provider: 'google' | 'facebook' | 'github') => Promise<{ error: AuthErrorWithMetadata | null }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthErrorWithMetadata | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthErrorWithMetadata | null }>;
  refreshSession: () => Promise<boolean>;
  getRemainingSessionTime: () => number;
  supabase: SupabaseClient; // Expose Supabase client
};

// Create the enhanced auth context
const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

// Auth provider props type
type EnhancedAuthProviderProps = {
  children: React.ReactNode;
  sessionTimeoutWarningSeconds?: number;
  sessionTimeoutSeconds?: number;
};

// Enhanced Auth provider component
export const EnhancedAuthProvider = ({ 
  children,
  sessionTimeoutWarningSeconds = 60,
  sessionTimeoutSeconds = 3600,
}: EnhancedAuthProviderProps) => {
  const [enhancedSession, setEnhancedSession] = useState<EnhancedSession>({
    user: null,
    session: null,
    roles: ['guest'],
    lastActive: Date.now(),
    expiresAt: null,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showSessionTimeoutWarning, setShowSessionTimeoutWarning] = useState(false);
  
  // Initialize session manager
  const sessionManager = useRef<SessionManager>(
    getSessionManager({
      warningThreshold: sessionTimeoutWarningSeconds,
      sessionTimeout: sessionTimeoutSeconds,
      extendOnActivity: true,
    })
  );

  // Set up timeout handlers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Set event handlers for timeout warning and actual timeout
    sessionManager.current.setEventHandlers(
      // Warning handler
      () => {
        setShowSessionTimeoutWarning(true);
        
        // Log timeout warning if we have user info
        if (enhancedSession.user && enhancedSession.session) {
          const { userAgent } = getClientInfo();
          logSessionActivity({
            userId: enhancedSession.user.id,
            activityType: SESSION_ACTIVITY_TYPES.TIMEOUT_WARNING,
            sessionId: enhancedSession.session.access_token,
            userAgent,
            metadata: {
              platform: 'web',
              warningThresholdSeconds: sessionTimeoutWarningSeconds,
              sessionTimeoutSeconds: sessionTimeoutSeconds
            }
          }).catch(err => console.error('Failed to log session activity:', err));
        }
      },
      // Timeout handler
      async () => {
        toast.error('Your session has expired due to inactivity');
        
        // Log timeout if we have user info
        if (enhancedSession.user && enhancedSession.session) {
          const { userAgent } = getClientInfo();
          logSessionActivity({
            userId: enhancedSession.user.id,
            activityType: SESSION_ACTIVITY_TYPES.TIMEOUT,
            sessionId: enhancedSession.session.access_token,
            userAgent,
            metadata: {
              platform: 'web',
              reason: 'inactivity',
              timeoutThresholdSeconds: sessionTimeoutSeconds
            }
          }).catch(err => console.error('Failed to log session activity:', err));
        }
        
        await handleLogout('timeout');
      }
    );
    
    // Return cleanup function
    return () => {
      sessionManager.current.cleanup();
    };
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          handleAuthError(sessionError, { context: 'init_session' });
          setIsAuthReady(true);
          setIsLoading(false);
          return;
        }

        if (currentSession) {
          // Get user details
          const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !currentUser) {
            handleAuthError(userError || { message: 'User not found' }, { context: 'init_user' });
            setIsAuthReady(true);
            setIsLoading(false);
            return;
          }
          
          // Initialize session manager with user and session
          sessionManager.current.initializeSession(currentSession, currentUser);
          
          // Get session data from manager
          const sessionData = sessionManager.current.getSessionData();
          
          if (mounted) {
            setEnhancedSession(sessionData);
          }
        }

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, changedSession) => {
            // Handle auth events
            switch (event) {
              case 'SIGNED_IN':
                const { data: { user: signedInUser } } = await supabase.auth.getUser();
                
                if (signedInUser && changedSession) {
                  // Update session manager
                  sessionManager.current.initializeSession(changedSession, signedInUser);
                  
                  // Update state
                  setEnhancedSession(sessionManager.current.getSessionData());
                  
                  // Log session activity with proper awaiting
                  try {
                    const { userAgent } = getClientInfo();
                    console.log('Auth state change: Logging login for user:', signedInUser.id);
                    await logSessionActivity({
                      userId: signedInUser.id,
                      activityType: SESSION_ACTIVITY_TYPES.LOGIN,
                      sessionId: changedSession.access_token,
                      userAgent,
                      metadata: {
                        platform: 'web',
                        loginMethod: 'auth_state_change'
                      }
                    });
                    console.log('Auth state change: Login activity logged successfully');
                  } catch (logError) {
                    console.error('Auth state change: Failed to log login activity:', logError);
                  }
                }
                break;
                
              case 'SIGNED_OUT':
                // Log the logout if we still have user info - with proper awaiting
                if (enhancedSession.user && enhancedSession.session) {
                  try {
                    const { userAgent } = getClientInfo();
                    console.log('Auth state change: Logging logout for user:', enhancedSession.user.id);
                    await logSessionActivity({
                      userId: enhancedSession.user.id,
                      activityType: SESSION_ACTIVITY_TYPES.LOGOUT,
                      sessionId: enhancedSession.session.access_token,
                      userAgent,
                      metadata: {
                        platform: 'web',
                        reason: 'auth_state_change'
                      }
                    });
                    console.log('Auth state change: Logout activity logged successfully');
                  } catch (logError) {
                    console.error('Auth state change: Failed to log logout activity:', logError);
                  }
                }
                
                // Clear session
                sessionManager.current.clearSession();
                setEnhancedSession({
                  user: null,
                  session: null,
                  roles: ['guest'],
                  lastActive: Date.now(),
                  expiresAt: null,
                });
                break;
                
              case 'TOKEN_REFRESHED':
                // Update session if user exists
                if (enhancedSession.user && changedSession) {
                  sessionManager.current.initializeSession(changedSession, enhancedSession.user);
                  setEnhancedSession(sessionManager.current.getSessionData());
                }
                break;
                
              case 'USER_UPDATED':
                // Refresh user data
                const { data: { user: updatedUser } } = await supabase.auth.getUser();
                if (updatedUser && changedSession) {
                  sessionManager.current.initializeSession(changedSession, updatedUser);
                  setEnhancedSession(sessionManager.current.getSessionData());
                }
                break;
            }
          }
        );

        if (mounted) {
          setIsAuthReady(true);
          setIsLoading(false);
        }
        
        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        handleAuthError(error, { context: 'auth_init' });
        
        if (mounted) {
          setIsAuthReady(true);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Attempt sign in
      const { user: signedInUser, session: newSession, error } = await signInWithEmail(email, password);

      // Handle error
      if (error) {
        const normalizedError = handleAuthError(error, { context: 'signin', email });
        
        // Log auth error
        const { userAgent } = getClientInfo();
        logSessionActivity({
          userId: email, // We don't have user ID yet, so use email
          activityType: SESSION_ACTIVITY_TYPES.AUTH_ERROR,
          userAgent,
          metadata: {
            errorDetails: normalizedError,
            platform: 'web',
            attemptType: 'email_signin'
          }
        }).catch(err => console.error('Failed to log auth error:', err));
        
        setIsLoading(false);
        return { error: normalizedError };
      }

      // Initialize session in manager
      if (signedInUser && newSession) {
        sessionManager.current.initializeSession(newSession, signedInUser);
        setEnhancedSession(sessionManager.current.getSessionData());
        
        // Log successful login - with awaited execution and more detailed error handling
        try {
          const { userAgent } = getClientInfo();
          console.log('Logging login activity for user:', signedInUser.id);
          await logSessionActivity({
            userId: signedInUser.id,
            activityType: SESSION_ACTIVITY_TYPES.LOGIN,
            sessionId: newSession.access_token,
            userAgent,
            metadata: {
              platform: 'web',
              loginMethod: 'email_password'
            }
          });
          console.log('Login activity logged successfully');
        } catch (logError) {
          console.error('Failed to log login activity:', logError);
        }
      }

      setIsLoading(false);
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      const normalizedError = handleAuthError(error, { context: 'signin_exception', email });
      setIsLoading(false);
      return { error: normalizedError };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Attempt sign up
      const { user: signedUpUser, session: newSession, error } = await signUpWithEmail(email, password);

      // Handle error
      if (error) {
        const normalizedError = handleAuthError(error, { context: 'signup', email });
        setIsLoading(false);
        return { error: normalizedError };
      }

      // Initialize session in manager if sign-up provides immediate session
      if (signedUpUser && newSession) {
        sessionManager.current.initializeSession(newSession, signedUpUser);
        setEnhancedSession(sessionManager.current.getSessionData());
      }

      setIsLoading(false);
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      const normalizedError = handleAuthError(error, { context: 'signup_exception', email });
      setIsLoading(false);
      return { error: normalizedError };
    }
  };

  // Sign in with social provider
  const socialSignIn = async (provider: 'google' | 'facebook' | 'github') => {
    try {
      setIsLoading(true);
      
      // Attempt social sign in
      const { error } = await signInWithProvider(provider);

      // Handle error
      if (error) {
        const normalizedError = handleAuthError(error, { context: 'social_signin', provider });
        setIsLoading(false);
        return { error: normalizedError };
      }

      setIsLoading(false);
      return { error: null };
    } catch (error) {
      console.error('Social sign in error:', error);
      const normalizedError = handleAuthError(error, { context: 'social_signin_exception', provider });
      setIsLoading(false);
      return { error: normalizedError };
    }
  };

  // Sign out
  const handleLogout = async (reason: string = 'user-initiated'): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Log logout activity before clearing the session - with awaited execution
      if (enhancedSession.user && enhancedSession.session) {
        try {
          const { userAgent } = getClientInfo();
          const sessionStartTime = enhancedSession.session.expires_at 
            ? new Date(enhancedSession.session.expires_at * 1000 - (sessionTimeoutSeconds * 1000)).getTime()
            : Date.now() - 60000; // Fallback to 1 minute ago

          console.log('Logging logout activity for user:', enhancedSession.user.id);
          await logSessionActivity({
            userId: enhancedSession.user.id,
            activityType: SESSION_ACTIVITY_TYPES.LOGOUT,
            sessionId: enhancedSession.session.access_token,
            userAgent,
            metadata: {
              platform: 'web',
              reason: reason,
              duration: Date.now() - sessionStartTime
            }
          });
          console.log('Logout activity logged successfully');
        } catch (logError) {
          console.error('Failed to log logout activity:', logError);
        }
      }
      
      // Clear session in manager first
      sessionManager.current.clearSession();
      
      // Perform sign out
      const { error } = await signOut();

      // Handle error
      if (error) {
        handleAuthError(error, { context: 'signout' });
        setIsLoading(false);
        // We're no longer returning the error object, just throw if needed
        if (error) throw error;
      }

      // Update state
      setEnhancedSession({
        user: null,
        session: null,
        roles: ['guest'],
        lastActive: Date.now(),
        expiresAt: null,
      });

      // Redirect to signin page after successful logout
      window.location.href = '/auth/signin';

      setIsLoading(false);
    } catch (error) {
      console.error('Sign out error:', error);
      handleAuthError(error, { context: 'signout_exception' });
      setIsLoading(false);
      // We don't rethrow as we want logout to be non-blocking
    }
  };

  // Reset password
  const handleResetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      
      // Attempt password reset
      const { error } = await resetPassword(email);

      // Handle error
      if (error) {
        const normalizedError = handleAuthError(error, { context: 'reset_password', email });
        setIsLoading(false);
        return { error: normalizedError };
      }

      setIsLoading(false);
      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      const normalizedError = handleAuthError(error, { context: 'reset_password_exception', email });
      setIsLoading(false);
      return { error: normalizedError };
    }
  };

  // Update password
  const handleUpdatePassword = async (password: string) => {
    try {
      setIsLoading(true);
      
      // Attempt password update
      const { error } = await updatePassword(password);

      // Handle error
      if (error) {
        const normalizedError = handleAuthError(error, { context: 'update_password' });
        setIsLoading(false);
        return { error: normalizedError };
      }

      setIsLoading(false);
      return { error: null };
    } catch (error) {
      console.error('Update password error:', error);
      const normalizedError = handleAuthError(error, { context: 'update_password_exception' });
      setIsLoading(false);
      return { error: normalizedError };
    }
  };

  // Refresh session
  const refreshSession = async (): Promise<boolean> => {
    // Get current session before refresh to use for activity logging if needed
    const currentSession = enhancedSession.session;
    
    // Perform session refresh
    const result = await sessionManager.current.refreshSession();
    
    // Get updated session data
    const updatedSessionData = sessionManager.current.getSessionData();
    const refreshedSession = updatedSessionData.session;
    
    // Log refresh activity with proper awaiting
    if (result && refreshedSession && enhancedSession.user) {
      try {
        const { userAgent } = getClientInfo();
        console.log('Logging session refresh for user:', enhancedSession.user.id);
        await logSessionActivity({
          userId: enhancedSession.user.id,
          activityType: SESSION_ACTIVITY_TYPES.REFRESH,
          sessionId: refreshedSession.access_token,
          userAgent,
          metadata: {
            platform: 'web',
            refreshMethod: 'manual'
          }
        });
        console.log('Session refresh activity logged successfully');
      } catch (logError) {
        console.error('Failed to log session refresh activity:', logError);
      }
    }
    
    return result;
  };

  // Get remaining session time
  const getRemainingSessionTime = (): number => {
    return sessionManager.current.getRemainingSessionTime();
  };

  // Check if user has a role
  const hasRole = (role: UserRole): boolean => {
    return enhancedSession.roles.includes(role);
  };

  // Create value object
  const value = {
    user: enhancedSession.user,
    session: enhancedSession.session,
    roles: enhancedSession.roles,
    isLoading: !isAuthReady || isLoading,
    isAuthReady,
    hasRole,
    signIn,
    signUp,
    signInWithProvider: socialSignIn,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    refreshSession,
    getRemainingSessionTime,
    supabase, // Add supabase client to context value
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {showSessionTimeoutWarning && (
        <SessionTimeoutAlert
          timeoutMinutes={Math.ceil(sessionTimeoutWarningSeconds / 60)}
          onContinue={refreshSession}
          onLogout={handleLogout}
          isOpen={showSessionTimeoutWarning}
        />
      )}
      {children}
    </EnhancedAuthContext.Provider>
  );
};

// Hook for using enhanced auth context
export const useEnhancedAuth = () => {
  const context = useContext(EnhancedAuthContext);

  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }

  return context;
};

// For backward compatibility - provides same interface as old useAuth but with enhanced functionality
export const useAuth = useEnhancedAuth;
