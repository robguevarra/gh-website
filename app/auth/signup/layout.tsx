import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Graceful Homeschooling',
  description: 'Create your Graceful Homeschooling account to access exclusive homeschooling resources and courses.',
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 