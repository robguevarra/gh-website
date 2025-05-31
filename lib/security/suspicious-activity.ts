/**
 * Suspicious activity detection
 * Implements detection and logging of potentially malicious authentication attempts
 */

import { NextRequest, NextResponse } from 'next/server';

// Interface for suspicious activity configuration
export interface SuspiciousActivityConfig {
  // Whether to enable IP tracking
  enableIpTracking?: boolean;
  // Whether to enable user agent tracking
  enableUserAgentTracking?: boolean;
  // Whether to enable geolocation tracking
  enableGeolocationTracking?: boolean;
  // Threshold for failed login attempts before triggering alerts
  failedLoginThreshold?: number;
  // Time window in seconds for counting failed attempts
  failedLoginWindowSeconds?: number;
  // Callback function for handling suspicious activity
  onSuspiciousActivity?: (activity: SuspiciousActivity) => Promise<void> | void;
}

// Interface for suspicious activity data
export interface SuspiciousActivity {
  // Type of suspicious activity
  type: 'failed_login' | 'unusual_location' | 'rapid_attempts' | 'multiple_accounts' | 'other';
  // Severity level
  severity: 'low' | 'medium' | 'high';
  // User ID if available
  userId?: string;
  // Email if available
  email?: string;
  // IP address
  ipAddress?: string;
  // User agent
  userAgent?: string;
  // Geolocation data if available
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
  // Timestamp
  timestamp: number;
  // Additional details
  details?: Record<string, any>;
}

// In-memory store for tracking login attempts
class LoginAttemptTracker {
  private attempts: Map<string, { count: number, firstAttempt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(private windowSeconds: number, private cleanupIntervalMs: number = 60000) {
    // Set up cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }
  
  // Record a failed login attempt
  recordFailedAttempt(key: string): { count: number, isNew: boolean } {
    const now = Date.now();
    const entry = this.attempts.get(key);
    
    if (!entry || now - entry.firstAttempt > this.windowSeconds * 1000) {
      // New entry or expired entry
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return { count: 1, isNew: true };
    } else {
      // Increment existing entry
      const newCount = entry.count + 1;
      this.attempts.set(key, { count: newCount, firstAttempt: entry.firstAttempt });
      return { count: newCount, isNew: false };
    }
  }
  
  // Get the number of failed attempts for a key
  getFailedAttempts(key: string): number {
    const entry = this.attempts.get(key);
    const now = Date.now();
    
    if (!entry || now - entry.firstAttempt > this.windowSeconds * 1000) {
      return 0;
    }
    
    return entry.count;
  }
  
  // Reset failed attempts for a key
  resetFailedAttempts(key: string): void {
    this.attempts.delete(key);
  }
  
  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    const expiredTime = now - this.windowSeconds * 1000;
    
    for (const [key, entry] of this.attempts.entries()) {
      if (entry.firstAttempt < expiredTime) {
        this.attempts.delete(key);
      }
    }
  }
  
  // Dispose of the tracker
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attempts.clear();
  }
}

// Default configuration
const DEFAULT_CONFIG: SuspiciousActivityConfig = {
  enableIpTracking: true,
  enableUserAgentTracking: true,
  enableGeolocationTracking: false,
  failedLoginThreshold: 5,
  failedLoginWindowSeconds: 300, // 5 minutes
  onSuspiciousActivity: async (activity) => {
    // Default implementation just logs to console
    console.warn('Suspicious activity detected:', activity);
  },
};

// Global login attempt tracker
const globalLoginTracker = new LoginAttemptTracker(
  DEFAULT_CONFIG.failedLoginWindowSeconds || 300
);

/**
 * Create a suspicious activity detection middleware with the given configuration
 */
export function createSuspiciousActivityDetection(config: SuspiciousActivityConfig = {}) {
  // Merge default config with provided config
  const mergedConfig: SuspiciousActivityConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  
  return async function suspiciousActivityMiddleware(request: NextRequest, response: NextResponse) {
    // Get the path and method
    const { pathname } = request.nextUrl;
    const method = request.method;
    
    // Only process certain endpoints
    const isAuthEndpoint = (
      pathname.includes('/api/auth') || 
      pathname.includes('/login') || 
      pathname.includes('/signup') || 
      pathname.includes('/reset-password')
    );
    
    if (!isAuthEndpoint) {
      return response;
    }
    
    // Extract information from the request
    const ip = mergedConfig.enableIpTracking ? (request.headers.get('x-forwarded-for') || 'unknown') : undefined;
    const userAgent = mergedConfig.enableUserAgentTracking ? request.headers.get('user-agent') || undefined : undefined;
    
    // For failed login attempts (status 401 or 403)
    if (response.status === 401 || response.status === 403) {
      if (ip) {
        const { count, isNew } = globalLoginTracker.recordFailedAttempt(ip);
        
        // If we've exceeded the threshold, trigger the suspicious activity handler
        if (count >= (mergedConfig.failedLoginThreshold || 5)) {
          const activity: SuspiciousActivity = {
            type: 'failed_login',
            severity: count >= 10 ? 'high' : 'medium',
            ipAddress: ip,
            userAgent,
            timestamp: Date.now(),
            details: {
              failedAttempts: count,
              endpoint: pathname,
              method,
            },
          };
          
          // Call the suspicious activity handler
          if (mergedConfig.onSuspiciousActivity) {
            await mergedConfig.onSuspiciousActivity(activity);
          }
        }
      }
    }
    
    // For successful login attempts (status 200 or 204)
    if ((response.status === 200 || response.status === 204) && 
        (pathname.includes('/login') || pathname.includes('/api/auth/token'))) {
      // Reset failed attempts for this IP
      if (ip) {
        globalLoginTracker.resetFailedAttempts(ip);
      }
    }
    
    return response;
  };
}

/**
 * Log a suspicious activity event
 * This can be called directly from application code when suspicious activity is detected
 */
export async function logSuspiciousActivity(
  activity: Omit<SuspiciousActivity, 'timestamp'>,
  config: SuspiciousActivityConfig = DEFAULT_CONFIG
): Promise<void> {
  const fullActivity: SuspiciousActivity = {
    ...activity,
    timestamp: Date.now(),
  };
  
  if (config.onSuspiciousActivity) {
    await config.onSuspiciousActivity(fullActivity);
  } else if (DEFAULT_CONFIG.onSuspiciousActivity) {
    await DEFAULT_CONFIG.onSuspiciousActivity(fullActivity);
  }
}

// Export a default instance with standard configuration
export const suspiciousActivityDetection = createSuspiciousActivityDetection();
