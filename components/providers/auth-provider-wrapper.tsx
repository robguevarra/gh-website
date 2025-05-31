'use client';

import React from 'react';
import { EnhancedAuthProvider } from '@/context/enhanced-auth-context';

interface AuthProviderWrapperProps {
  children: React.ReactNode;
  sessionTimeoutWarningSeconds?: number;
  sessionTimeoutSeconds?: number;
}

/**
 * This component wraps the application with our enhanced auth provider.
 * It provides improved session management and error handling capabilities.
 */
export function AuthProviderWrapper({
  children,
  sessionTimeoutWarningSeconds = 300, // 5 minutes warning by default
  sessionTimeoutSeconds = 3600, // 1 hour session by default
}: AuthProviderWrapperProps) {
  return (
    <EnhancedAuthProvider 
      sessionTimeoutWarningSeconds={sessionTimeoutWarningSeconds}
      sessionTimeoutSeconds={sessionTimeoutSeconds}
    >
      {children}
    </EnhancedAuthProvider>
  );
}
