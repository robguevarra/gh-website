"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import client component dynamically
const AffiliateTrackerClient = dynamic(
  () => import('./client/affiliate-tracker-client'),
  { ssr: false }
);

/**
 * Client component wrapper for the affiliate tracker
 * This allows us to use the tracker in server components like layout.tsx
 */
export function AffiliateTrackerWrapper({
  debug = false,
}: {
  debug?: boolean;
}) {
  return (
    <AffiliateTrackerClient debug={debug} />
  );
}

export default AffiliateTrackerWrapper;
