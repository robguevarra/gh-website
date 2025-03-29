'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import DashboardHeader from '@/components/dashboard-header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // If user is not authenticated and not loading, redirect to signin
    if (!isLoading) {
      setHasCheckedAuth(true);
      if (!user) {
        router.push('/auth/signin');
      }
    }
  }, [user, isLoading, router]);

  // Failsafe to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setHasCheckedAuth(true);
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Show loading state while checking authentication (but only for a reasonable time)
  if (isLoading && !hasCheckedAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, render the children
  if (user) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // If we've checked auth, aren't loading, and have no user, show a message until redirect happens
  if (hasCheckedAuth && !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Fallback return (shouldn't be reached)
  return null;
} 