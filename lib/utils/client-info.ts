/**
 * Utility functions for getting client-side information
 */

/**
 * Gets information about the client browser and environment
 * @returns Object containing userAgent and clientIP (when available)
 */
export function getClientInfo() {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  
  // Client IP will be null in client components
  // This can only be populated in server components or API routes
  const clientIP = null;
  
  return {
    userAgent,
    clientIP
  };
}
