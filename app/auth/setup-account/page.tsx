import { Metadata } from 'next';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';

export const metadata: Metadata = {
  title: 'Set Up Your Account - Graceful Homeschooling',
  description: 'Complete your account setup for Graceful Homeschooling',
};

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
        <UpdatePasswordForm redirectUrl="/dashboard" />
      </div>
    </div>
  );
} 