/**
 * Rate limiting implementation for API routes
 * Uses a simple in-memory store with Edge Runtime compatibility
 */

interface RateLimitOptions {
  // Time window in milliseconds
  interval: number;
  // Maximum number of requests allowed in the interval
  limit?: number;
  // Maximum number of unique tokens per interval
  uniqueTokenPerInterval?: number;
}

interface RateLimitResult {
  // Whether the request should be allowed
  success: boolean;
  // How many requests have been made in the current interval
  currentCount: number;
  // Time in milliseconds until the rate limit resets
  resetIn: number;
}

// Simple in-memory store that works in Edge Runtime
class EdgeRateLimitStore {
  private readonly cache = new Map<string, { count: number; resetAt: number }>();
  private readonly options: {
    max: number;
  };

  constructor(options: { max: number }) {
    this.options = options;
  }

  // Clean up expired entries
  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.resetAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  // Increment the counter for a token
  async increment(key: string, resetIn: number): Promise<RateLimitResult> {
    const now = Date.now();
    const resetAt = now + resetIn;

    // Clean up expired entries periodically
    if (this.cache.size > this.options.max / 2) {
      this.cleanup();
    }

    // Get or create entry
    const entry = this.cache.get(key) || { count: 0, resetAt };

    // If entry has expired, reset the counter
    if (entry.resetAt <= now) {
      entry.count = 0;
      entry.resetAt = resetAt;
    }

    // Increment the counter
    entry.count++;
    this.cache.set(key, entry);

    return {
      success: true,
      currentCount: entry.count,
      resetIn: Math.max(0, entry.resetAt - now),
    };
  }
}

// Global store instance
const store = new EdgeRateLimitStore({ max: 1000 });

/**
 * Create a rate limiter function
 */
export function rateLimit(options: RateLimitOptions) {
  const { interval, limit = 10, uniqueTokenPerInterval = 100 } = options;

  return async function rateLimiterMiddleware(token: string): Promise<RateLimitResult> {
    const result = await store.increment(token, interval);

    // Check if the limit has been exceeded
    if (result.currentCount > limit) {
      return {
        success: false,
        currentCount: result.currentCount,
        resetIn: result.resetIn,
      };
    }

    return result;
  };
}
