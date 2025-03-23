import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set Up Your Account - Graceful Homeschooling',
  description: 'Complete your account setup for Graceful Homeschooling',
};

export default function SetupAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 