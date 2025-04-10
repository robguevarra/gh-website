'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import DashboardHeader from '@/components/dashboard-header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if auth is ready and user is not authenticated
    if (isAuthReady && !user) {
      router.push('/auth/signin');
    }
  }, [user, isAuthReady, router]);

  // Show initial loading state while auth is being initialized
  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (isLoading) {
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

  // This return shouldn't be reached because of the redirect,
  // but we need a return value to satisfy TypeScript
  return null;
} 