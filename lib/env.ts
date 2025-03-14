/**
 * Environment variables configuration
 * This file centralizes access to environment variables and ensures they're properly exposed
 * to both client and server components
 */

// Server-side environment variables (not exposed to the client)
export const serverEnv = {
  // Social Media API Keys (server-only)
  FACEBOOK_ACCESS_TOKEN: process.env.FACEBOOK_ACCESS_TOKEN || '',
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  
  // Xendit API Keys (server-only)
  XENDIT_SECRET_KEY: process.env.XENDIT_SECRET_KEY || '',
  XENDIT_WEBHOOK_SECRET: process.env.XENDIT_WEBHOOK_SECRET || '',
};

// Client-side environment variables (must be prefixed with NEXT_PUBLIC_)
export const clientEnv = {
  // Social Media API Keys (client-side versions)
  FACEBOOK_ACCESS_TOKEN: process.env.NEXT_PUBLIC_FACEBOOK_ACCESS_TOKEN || '',
  YOUTUBE_API_KEY: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '',
  
  // Public keys
  XENDIT_PUBLIC_KEY: process.env.NEXT_PUBLIC_XENDIT_PUBLIC_KEY || '',
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
};

// Helper function to get environment variables based on context
export function getEnv(key: string): string {
  // Check if we're in a server component
  if (typeof window === 'undefined') {
    // Server-side
    const serverValue = (serverEnv as Record<string, string>)[key] || 
                        (clientEnv as Record<string, string>)[key] || '';
    
    if (process.env.NODE_ENV === 'development') {
      if (!serverValue) {
        console.warn(`[Server] Environment variable ${key} not found`);
      } else {
        console.log(`[Server] Found environment variable ${key}`);
      }
    }
    
    return serverValue;
  } else {
    // Client-side
    const clientValue = (clientEnv as Record<string, string>)[key] || '';
    
    if (process.env.NODE_ENV === 'development') {
      if (!clientValue) {
        console.warn(`[Client] Environment variable ${key} not found`);
      } else {
        console.log(`[Client] Found environment variable ${key}`);
      }
    }
    
    return clientValue;
  }
} 