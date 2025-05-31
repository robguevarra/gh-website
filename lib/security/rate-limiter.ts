/**
 * Rate limiting implementation for protecting authentication endpoints
 * This provides a simple in-memory rate limiter with configurable limits
 */

import { NextRequest, NextResponse } from 'next/server';

// Interface for rate limit configuration
export interface RateLimitConfig {
  // Maximum number of requests allowed in the window
  limit: number;
  // Time window in seconds
  windowSizeInSeconds: number;
  // Optional identifier for the rate limiter
  identifier?: string;
  // Optional message to return when rate limited
  message?: string;
}

// Interface for rate limit entry
interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
}

// In-memory store for rate limiting
class InMemoryStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(private cleanupIntervalMs: number = 60000) {
    // Set up cleanup interval to remove expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }
  
  // Get rate limit entry for a key
  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }
  
  // Set or update rate limit entry
  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }
  
  // Increment count for a key
  increment(key: string, resetAt: number): RateLimitEntry {
    const entry = this.store.get(key) || { count: 0, resetAt, blocked: false };
    
    // If the entry has expired, reset it
    if (Date.now() > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = resetAt;
      entry.blocked = false;
    } else {
      entry.count += 1;
    }
    
    this.store.set(key, entry);
    return entry;
  }
  
  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt && !entry.blocked) {
        this.store.delete(key);
      }
    }
  }
  
  // Mark a key as blocked
  block(key: string, resetAt: number): void {
    const entry = this.store.get(key) || { count: 0, resetAt, blocked: false };
    entry.blocked = true;
    entry.resetAt = resetAt;
    this.store.set(key, entry);
  }
  
  // Dispose of the store and clear the cleanup interval
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Global in-memory store instance
const globalStore = new InMemoryStore();

/**
 * Create a rate limiting middleware with the given configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    limit,
    windowSizeInSeconds,
    identifier = 'default',
    message = 'Too many requests, please try again later',
  } = config;
  
  return async function rateLimiterMiddleware(request: NextRequest, response: NextResponse) {
    // Get client IP address
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Create a unique key for this rate limit
    // Using both the identifier and IP to scope the rate limit
    const key = `${identifier}:${ip}`;
    
    // Calculate when this window resets
    const resetAt = Date.now() + windowSizeInSeconds * 1000;
    
    // Increment the counter for this key
    const entry = globalStore.increment(key, resetAt);
    
    // Set rate limit headers
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, limit - entry.count).toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());
    
    // If the entry is already blocked, return 429
    if (entry.blocked) {
      return new NextResponse(
        JSON.stringify({ error: message, retryAfter: Math.ceil((entry.resetAt - Date.now()) / 1000) }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((entry.resetAt - Date.now()) / 1000).toString(),
            ...Object.fromEntries(response.headers)
          }
        }
      );
    }
    
    // If the limit is exceeded, block the key and return 429
    if (entry.count > limit) {
      // Block for twice the window size as a penalty
      const blockResetAt = Date.now() + windowSizeInSeconds * 2000;
      globalStore.block(key, blockResetAt);
      
      return new NextResponse(
        JSON.stringify({ error: message, retryAfter: windowSizeInSeconds * 2 }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': (windowSizeInSeconds * 2).toString(),
            ...Object.fromEntries(response.headers)
          }
        }
      );
    }
    
    // Otherwise, allow the request
    return response;
  };
}

/**
 * Predefined rate limiters for common scenarios
 */
export const rateLimiters = {
  // Strict rate limiter for login attempts (10 per minute)
  login: createRateLimiter({
    limit: 10,
    windowSizeInSeconds: 60,
    identifier: 'auth:login',
    message: 'Too many login attempts, please try again later'
  }),
  
  // Rate limiter for signup attempts (5 per minute)
  signup: createRateLimiter({
    limit: 5,
    windowSizeInSeconds: 60,
    identifier: 'auth:signup',
    message: 'Too many signup attempts, please try again later'
  }),
  
  // Rate limiter for password reset (3 per 5 minutes)
  passwordReset: createRateLimiter({
    limit: 3,
    windowSizeInSeconds: 300,
    identifier: 'auth:password-reset',
    message: 'Too many password reset attempts, please try again later'
  }),
  
  // Rate limiter for OTP verification (5 per 5 minutes)
  otpVerification: createRateLimiter({
    limit: 5,
    windowSizeInSeconds: 300,
    identifier: 'auth:otp-verification',
    message: 'Too many verification attempts, please try again later'
  }),
  
  // General API rate limiter (100 per minute)
  api: createRateLimiter({
    limit: 100,
    windowSizeInSeconds: 60,
    identifier: 'api:general',
    message: 'Rate limit exceeded, please slow down your requests'
  })
};
