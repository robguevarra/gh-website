'use client';

import { User, Session } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/client';

// Define types for session management
export type UserRole = 'admin' | 'student' | 'affiliate' | 'guest';

export interface EnhancedSession {
  session: Session | null;
  user: User | null;
  roles: UserRole[];
  lastActive: number; // timestamp
  expiresAt: number | null; // timestamp
}

export interface SessionTimeoutConfig {
  warningThreshold: number; // seconds before timeout to show warning
  sessionTimeout: number; // session timeout in seconds
  extendOnActivity: boolean; // whether to extend session on activity
}

// Default timeout configuration
const DEFAULT_TIMEOUT_CONFIG: SessionTimeoutConfig = {
  warningThreshold: 60, // Show warning 1 minute before timeout
  sessionTimeout: 3600, // 1 hour session timeout
  extendOnActivity: true, // Extend session on activity
};

/**
 * Session Manager Class
 * Handles session timeout, refresh, and activity tracking
 */
export class SessionManager {
  private timeoutConfig: SessionTimeoutConfig;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private onTimeoutWarning: (() => void) | null = null;
  private onSessionTimeout: (() => void) | null = null;
  private lastActivityTimestamp: number = Date.now();
  private supabase = getBrowserClient();
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private sessionData: EnhancedSession = {
    session: null,
    user: null,
    roles: [],
    lastActive: Date.now(),
    expiresAt: null,
  };

  constructor(config: Partial<SessionTimeoutConfig> = {}) {
    this.timeoutConfig = { ...DEFAULT_TIMEOUT_CONFIG, ...config };
    
    // Start tracking activity when in browser environment
    if (typeof window !== 'undefined') {
      this.setupActivityTracking();
      this.startSessionMonitoring();
    }
  }

  /**
   * Initialize the session manager with user and session data
   */
  public initializeSession(session: Session | null, user: User | null): void {
    if (!session || !user) {
      this.clearSession();
      return;
    }

    // Determine user roles based on claims or other data
    const roles = this.extractRolesFromUser(user);

    // Calculate session expiry
    const expiresAt = session?.expires_at 
      ? session.expires_at * 1000 // Convert to milliseconds
      : Date.now() + (this.timeoutConfig.sessionTimeout * 1000);

    this.sessionData = {
      session,
      user,
      roles,
      lastActive: Date.now(),
      expiresAt,
    };

    // Set timers
    this.setTimers();
    this.logSessionEvent('initialized', user.id);
  }

  /**
   * Update session with new activity
   */
  public updateActivity(): void {
    if (!this.sessionData.session) return;

    this.lastActivityTimestamp = Date.now();
    this.sessionData.lastActive = this.lastActivityTimestamp;
    
    if (this.timeoutConfig.extendOnActivity) {
      this.resetTimers();
    }
  }

  /**
   * Refresh the session with the server
   */
  public async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error || !data.session) {
        this.logSessionEvent('refresh_failed', this.sessionData.user?.id);
        return false;
      }
      
      // Update the session data
      this.sessionData.session = data.session;
      this.sessionData.user = data.user;
      this.sessionData.expiresAt = data.session?.expires_at 
        ? data.session.expires_at * 1000
        : Date.now() + (this.timeoutConfig.sessionTimeout * 1000);
      
      this.resetTimers();
      this.logSessionEvent('refreshed', data.user?.id);
      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      this.logSessionEvent('refresh_exception', this.sessionData.user?.id);
      return false;
    }
  }

  /**
   * Set event handlers for timeout warning and session timeout
   */
  public setEventHandlers(
    onTimeoutWarning: () => void,
    onSessionTimeout: () => void,
  ): void {
    this.onTimeoutWarning = onTimeoutWarning;
    this.onSessionTimeout = onSessionTimeout;
  }

  /**
   * Get the current session data
   */
  public getSessionData(): EnhancedSession {
    return { ...this.sessionData };
  }

  /**
   * Check if the user has a specific role
   */
  public hasRole(role: UserRole): boolean {
    return this.sessionData.roles.includes(role);
  }

  /**
   * Get remaining session time in seconds
   */
  public getRemainingSessionTime(): number {
    if (!this.sessionData.expiresAt) return 0;
    return Math.max(0, Math.floor((this.sessionData.expiresAt - Date.now()) / 1000));
  }

  /**
   * Clear the current session
   */
  public clearSession(): void {
    this.sessionData = {
      session: null,
      user: null,
      roles: [],
      lastActive: 0,
      expiresAt: null,
    };
    
    this.clearTimers();
    this.logSessionEvent('cleared');
  }

  /**
   * Extract roles from user metadata and claims
   */
  private extractRolesFromUser(user: User): UserRole[] {
    const roles: UserRole[] = [];
    
    // Default everyone to at least guest
    roles.push('guest');
    
    // Check if user has admin role in app_metadata
    if (user.app_metadata?.roles?.includes('admin')) {
      roles.push('admin');
    }
    
    // Check if user has student role
    if (user.app_metadata?.roles?.includes('student') || 
        user.user_metadata?.is_student === true) {
      roles.push('student');
    }
    
    // Check if user has affiliate role
    if (user.app_metadata?.roles?.includes('affiliate') ||
        user.user_metadata?.is_affiliate === true) {
      roles.push('affiliate');
    }
    
    return roles;
  }

  /**
   * Set up activity tracking on user actions
   */
  private setupActivityTracking(): void {
    if (typeof window === 'undefined') return;
    
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const activityHandler = () => {
      this.updateActivity();
    };
    
    activityEvents.forEach(event => {
      window.addEventListener(event, activityHandler, { passive: true });
    });
    
    // Return cleanup function
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
    };
  }

  /**
   * Start periodic session state monitoring
   */
  private startSessionMonitoring(): void {
    // Check session state every 60 seconds
    this.sessionCheckInterval = setInterval(() => {
      if (!this.sessionData.session) return;
      
      // If less than 5 minutes remaining, refresh the session
      const remainingTime = this.getRemainingSessionTime();
      if (remainingTime < 300 && remainingTime > 0) {
        this.refreshSession();
      }
    }, 60000);
  }

  /**
   * Set timers for session timeout warning and actual timeout
   */
  private setTimers(): void {
    this.clearTimers();
    
    if (!this.sessionData.expiresAt) return;
    
    const expiresIn = this.sessionData.expiresAt - Date.now();
    const warningTime = expiresIn - (this.timeoutConfig.warningThreshold * 1000);
    
    if (warningTime > 0) {
      this.warningTimer = setTimeout(() => {
        if (this.onTimeoutWarning) this.onTimeoutWarning();
        this.logSessionEvent('timeout_warning', this.sessionData.user?.id);
      }, warningTime);
    }
    
    if (expiresIn > 0) {
      this.timeoutTimer = setTimeout(() => {
        if (this.onSessionTimeout) this.onSessionTimeout();
        this.logSessionEvent('timed_out', this.sessionData.user?.id);
        this.clearSession();
      }, expiresIn);
    }
  }

  /**
   * Reset all timers
   */
  private resetTimers(): void {
    this.clearTimers();
    this.setTimers();
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  /**
   * Log session events for security monitoring
   */
  private logSessionEvent(
    eventType: 'initialized' | 'refreshed' | 'timed_out' | 'timeout_warning' | 'cleared' | 'refresh_failed' | 'refresh_exception',
    userId?: string | null
  ): void {
    // In a production app, you might want to send these logs to a server endpoint
    // Here we'll just log to the console in dev and use a fetch in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`Session event: ${eventType}`, { userId, timestamp: new Date().toISOString() });
      return;
    }
    
    // In production, send logs to your backend
    try {
      fetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: `session_${eventType}`,
          userId: userId || 'anonymous',
          timestamp: new Date().toISOString(),
          sessionId: this.sessionData.session?.access_token?.slice(-10) || 'none'
        }),
        // Use keepalive to ensure log is sent even if page is being unloaded
        keepalive: true
      }).catch(err => console.error('Failed to send session log:', err));
    } catch (e) {
      // Silent failure for logging - shouldn't impact user experience
      console.error('Failed to send session log:', e);
    }
  }

  /**
   * Clean up resources when component unmounts
   */
  public cleanup(): void {
    this.clearTimers();
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }
}

// Export a singleton instance that can be used across the app
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(config: Partial<SessionTimeoutConfig> = {}): SessionManager {
  if (typeof window === 'undefined') {
    // Return a new instance for server components to avoid shared state
    return new SessionManager(config);
  }
  
  // Create singleton instance for client components
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager(config);
  }
  
  return sessionManagerInstance;
}
