'use client';

import { useEffect } from 'react';
import { initAuthCoordination } from '@/lib/utils/auth-coordination';

/**
 * Provider component that initializes auth coordination
 * This sets up the necessary event listeners for cross-tab communication
 */
export function AuthCoordinationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize auth coordination and get cleanup function
    const cleanup = initAuthCoordination();
    
    // Return cleanup function to remove listeners when component unmounts
    return cleanup;
  }, []);
  
  // This is just a wrapper component, so render children directly
  return <>{children}</>;
}
