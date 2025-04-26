'use client';

import { useEffect } from 'react';
import { initAuthCoordination } from '@/lib/utils/auth-coordination';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/context/auth-context';

/**
 * Provider component that initializes auth coordination
 * This sets up the necessary event listeners for cross-tab communication
 * and syncs the cart with the user's authentication state
 */
export function AuthCoordinationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get cart store actions and auth state
  const setCartUserId = useCartStore(state => state.setUserId);
  const auth = useAuth();
  
  // Set up auth coordination
  useEffect(() => {
    // Initialize auth coordination and get cleanup function
    const cleanup = initAuthCoordination();
    
    // Return cleanup function to remove listeners when component unmounts
    return cleanup;
  }, []);
  
  // Sync cart with user authentication state
  useEffect(() => {
    if (auth.isAuthReady) {
      // When auth is ready, update the cart's user ID
      setCartUserId(auth.user?.id || null);
    }
  }, [auth.isAuthReady, auth.user?.id, setCartUserId]);
  
  // This is just a wrapper component, so render children directly
  return <>{children}</>;
}
