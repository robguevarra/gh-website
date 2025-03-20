import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Graceful Homeschooling',
  description: 'Sign in to your Graceful Homeschooling account to access your courses and resources.',
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 