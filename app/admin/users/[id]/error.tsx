'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error page for the user detail view
 * This is automatically used by Next.js when an error occurs in the page
 */
export default function UserDetailErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('User detail page error:', error);
  }, [error]);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </Link>
        </div>
      </div>
      
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          There was a problem loading the user details. Please try again or contact support if the issue persists.
          {error.message && (
            <div className="mt-2 text-sm font-mono bg-destructive/10 p-2 rounded">
              {error.message}
            </div>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={reset} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
