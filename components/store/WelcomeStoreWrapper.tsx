'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the WelcomeStoreModal with client-side only execution
// This should be done in a client component, not a server component
const WelcomeStoreModal = dynamic(
  () => import('@/components/store/WelcomeStoreModal'),
  { ssr: false }
);

interface WelcomeStoreWrapperProps {
  hideForDays?: number;
}

/**
 * Client component wrapper for dynamically importing the WelcomeStoreModal
 * This resolves the build error from using dynamic with ssr:false in a Server Component
 */
const WelcomeStoreWrapper: React.FC<WelcomeStoreWrapperProps> = ({ hideForDays = 30 }) => {
  return <WelcomeStoreModal hideForDays={hideForDays} />;
};

export default WelcomeStoreWrapper;
