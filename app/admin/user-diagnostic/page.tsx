import { Suspense } from 'react';
import { Metadata } from 'next';
import { UserDiagnosticInterface } from '@/components/admin/user-diagnostic-interface';

export const metadata: Metadata = {
  title: 'User Support Diagnostic Tool | Admin',
  description: 'Comprehensive user diagnostic and email management tool for resolving support issues',
};

export default function UserDiagnosticPage() {
  return (
    <div className="container py-4 sm:py-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            User Support Diagnostic Tool
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Search users by any email, view all associated data, and manage email conflicts
          </p>
        </div>
      </div>
      
      <Suspense fallback={<div>Loading diagnostic tool...</div>}>
        <UserDiagnosticInterface />
      </Suspense>
    </div>
  );
}