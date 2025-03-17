/**
 * Utility functions for API integrations
 */

// Format large numbers for display (e.g., 1.2K, 3.5M)
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

// Safely access environment variables with fallbacks
export function getEnvVariable(key: string, fallback = ""): string {
  // For server components
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key] || fallback;
    
    // Only log in development
    if (process.env.NODE_ENV === "development") {
      if (!value || value === fallback) {
        console.warn(`[Server] Environment variable ${key} not found, using fallback`);
      } else {
        console.log(`[Server] Found environment variable ${key}`);
      }
    }
    
    return value;
  }
  
  // For client components - Next.js only exposes variables prefixed with NEXT_PUBLIC_
  if (typeof window !== "undefined") {
    const publicKey = `NEXT_PUBLIC_${key}`;
    // @ts-ignore - Access from window
    const value = typeof window.__NEXT_DATA__?.props?.pageProps?.[publicKey] !== "undefined" 
      // @ts-ignore - Access from window
      ? window.__NEXT_DATA__.props.pageProps[publicKey]
      : fallback;
      
    if (!value || value === fallback) {
      console.warn(`[Client] Environment variable ${key} not found, using fallback`);
    } else {
      console.log(`[Client] Found environment variable ${key}`);
    }
    
    return value;
  }
  
  console.warn(`[Unknown] Could not determine environment for ${key}, using fallback`);
  return fallback;
}

// Check if we're in a server component
export function isServer(): boolean {
  return typeof window === "undefined"
}

// Helper to handle API errors gracefully
export async function fetchWithFallback<T>(fetcher: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fetcher()
  } catch (error) {
    console.error("API fetch error:", error)
    return fallback
  }
}

// Validate API key exists and has proper format
export function validateApiKey(key: string | undefined, service: string): boolean {
  if (!key) {
    console.warn(`${service} API key not found`)
    return false
  }

  // Basic validation - can be expanded for specific API key formats
  if (key.length < 10) {
    console.warn(`${service} API key appears to be invalid (too short)`)
    return false
  }

  return true
}

