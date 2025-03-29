import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Update Password - Graceful Homeschooling',
  description: 'Set a new password for your Graceful Homeschooling account.',
};

// Force dynamic to ensure we avoid caching issues with auth state
export const dynamic = 'force-dynamic';

// Add a special segment config to indicate this route doesn't require auth
// This helps middleware identify this as a special auth flow page
export const runtime = 'edge';

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is independent and doesn't require auth check
  // It's used for the password recovery flow
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
} 