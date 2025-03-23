'use client';

import { Suspense } from 'react';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';

export default function SetupAccountPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-serif font-semibold tracking-tight">
            Welcome to Graceful Homeschooling
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a password to complete your account setup
          </p>
        </div>
        <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
          <UpdatePasswordForm redirectUrl="/dashboard" />
        </Suspense>
      </div>
    </div>
  );
} 