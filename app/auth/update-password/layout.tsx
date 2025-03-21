import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Update Password - Graceful Homeschooling',
  description: 'Set a new password for your Graceful Homeschooling account.',
};

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 