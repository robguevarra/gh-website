import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password - Graceful Homeschooling',
  description: 'Reset your Graceful Homeschooling account password to regain access to your account.',
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 