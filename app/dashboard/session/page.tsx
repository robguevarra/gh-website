import { EnhancedAuthProvider } from '@/context/enhanced-auth-context';
import SessionPageClient from './page-client';

// Server Component
export default function SessionManagementPage() {
  // Convert minutes to seconds for the provider props
  const sessionTimeoutSeconds = 30 * 60; // 30 minutes
  const sessionTimeoutWarningSeconds = 5 * 60; // 5 minutes
  
  return (
    <EnhancedAuthProvider 
      sessionTimeoutSeconds={sessionTimeoutSeconds}
      sessionTimeoutWarningSeconds={sessionTimeoutWarningSeconds}
    >
      <SessionPageClient />
    </EnhancedAuthProvider>
  );
}
