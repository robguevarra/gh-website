import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Update Password - Graceful Homeschooling',
  description: 'Set a new password for your Graceful Homeschooling account.',
};

// This ensures we don't inherit the dashboard layout
export const dynamic = 'force-dynamic';

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
} 