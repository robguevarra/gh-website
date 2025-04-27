'use client';

/**
 * Auth Coordination Utility
 * 
 * This utility helps coordinate authentication token refreshes across multiple tabs
 * to prevent conflicts when accessing different parts of the application simultaneously.
 */

// Use BroadcastChannel API for cross-tab communication if available
const isBrowser = typeof window !== 'undefined';
const broadcastSupported = isBrowser && 'BroadcastChannel' in window;

// Create a channel for auth events if supported
let authChannel: BroadcastChannel | null = null;

if (broadcastSupported) {
  try {
    authChannel = new BroadcastChannel('auth-coordination');
  } catch (e) {
    console.error('Failed to create BroadcastChannel:', e);
  }
}

// Track the last token refresh time
let lastTokenRefresh = 0;
const MIN_REFRESH_INTERVAL = 60000; // 1 minute minimum between refreshes

/**
 * Coordinates token refresh across tabs
 * @returns Promise that resolves when it's safe to refresh the token
 */
export async function coordinateTokenRefresh(): Promise<boolean> {
  // If we're not in a browser, just allow the refresh
  if (!isBrowser) {
    return true;
  }
  
  const now = Date.now();
  
  // If we've refreshed recently, don't do it again
  if (now - lastTokenRefresh < MIN_REFRESH_INTERVAL) {
    console.log('🔄 [Auth] Skipping token refresh - refreshed recently');
    return false;
  }
  
  // If broadcast is supported, coordinate with other tabs
  if (broadcastSupported && authChannel) {
    try {
    // Notify other tabs we're about to refresh
    authChannel.postMessage({ type: 'refresh-started', timestamp: now });
    } catch (error: any) {
      // Handle potential error if channel is closed unexpectedly
      if (error.name === 'InvalidStateError') {
        console.warn('[Auth] BroadcastChannel was closed when trying to post refresh-started.');
        authChannel = null; // Mark channel as unusable
      } else {
        console.error('[Auth] Error posting to BroadcastChannel:', error);
      }
      // Proceed without broadcast if channel failed
    }
    
    // Set the last refresh time
    lastTokenRefresh = now;
    
    return true;
  }
  
  // If broadcast isn't supported, just use a timestamp in localStorage
  try {
    const lastRefreshStr = localStorage.getItem('auth-last-refresh');
    const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;
    
    if (now - lastRefresh < MIN_REFRESH_INTERVAL) {
      console.log('🔄 [Auth] Skipping token refresh - another tab refreshed recently');
      return false;
    }
    
    // Update the last refresh time
    localStorage.setItem('auth-last-refresh', now.toString());
    lastTokenRefresh = now;
    
    return true;
  } catch (e) {
    // If localStorage fails, just allow the refresh
    console.error('Failed to access localStorage:', e);
    return true;
  }
}

/**
 * Notifies other tabs that a token refresh has completed
 */
export function notifyTokenRefreshComplete(): void {
  if (!isBrowser) {
    return;
  }
  
  // Update the last refresh time
  lastTokenRefresh = Date.now();
  
  // If broadcast is supported, notify other tabs
  if (broadcastSupported && authChannel) {
    try {
    authChannel.postMessage({ type: 'refresh-completed', timestamp: Date.now() });
    } catch (error: any) {
      // Handle potential error if channel is closed unexpectedly
      if (error.name === 'InvalidStateError') {
        console.warn('[Auth] BroadcastChannel was closed when trying to post refresh-completed.');
        authChannel = null; // Mark channel as unusable
      } else {
        console.error('[Auth] Error posting to BroadcastChannel:', error);
      }
    }
  }
  
  // Update localStorage
  try {
    localStorage.setItem('auth-last-refresh', Date.now().toString());
  } catch (e) {
    console.error('Failed to update localStorage:', e);
  }
}

/**
 * Sets up listeners for auth coordination events
 * Call this once during app initialization
 */
export function initAuthCoordination(): () => void {
  if (!isBrowser || !broadcastSupported || !authChannel) {
    return () => {}; // No-op cleanup if not supported
  }
  
  // Listen for messages from other tabs
  const handleMessage = (event: MessageEvent) => {
    const { type, timestamp } = event.data;
    
    if (type === 'refresh-started') {
      // Another tab is refreshing, update our last refresh time
      lastTokenRefresh = timestamp;
    } else if (type === 'refresh-completed') {
      // Another tab completed refreshing, update our last refresh time
      lastTokenRefresh = timestamp;
    }
  };
  
  authChannel.addEventListener('message', handleMessage);
  
  // Return cleanup function
  return () => {
    authChannel?.removeEventListener('message', handleMessage);
    // Safely attempt to close the channel
    try {
    authChannel?.close();
    } catch (error) {
      console.warn('[Auth] Error closing BroadcastChannel:', error);
    }
    authChannel = null; // Ensure reference is cleared
  };
}
