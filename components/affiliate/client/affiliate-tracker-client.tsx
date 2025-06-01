"use client";

import { useEffect, useState } from 'react';
import Script from 'next/script';

type AffiliateTrackerProps = {
  debug?: boolean;
  endpoint?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
};

/**
 * Client-side AffiliateTracker component for embedding the affiliate tracking pixel
 * 
 * This component loads the affiliate tracking script and initializes it with
 * the provided configuration. It only loads the script when needed (when an
 * affiliate parameter is present in the URL).
 */
export default function AffiliateTrackerClient({
  debug = false,
  endpoint = '/api/affiliate/click',
  onLoad,
  onError,
}: AffiliateTrackerProps) {
  const [hasAffiliateParam, setHasAffiliateParam] = useState<boolean>(false);

  useEffect(() => {
    // Check if URL contains affiliate parameter
    const params = new URLSearchParams(window.location.search);
    const hasAffParam = params.has('a') && Boolean(params.get('a'));
    console.log('[AffiliateTracker] URL Params:', Object.fromEntries(params.entries()));
    console.log('[AffiliateTracker] Has affiliate param:', hasAffParam);
    setHasAffiliateParam(hasAffParam);
  }, []);

  // If no affiliate parameter is present, don't load the script
  if (!hasAffiliateParam) {
    return null;
  }

  // Initialize the tracker once the script is loaded
  const handleScriptLoad = () => {
    try {
      // Initialize with configuration
      if (window.GHAffiliate) {
        window.GHAffiliate.init({
          debug,
          endpoint,
        });
        
        // Manually trigger tracking to ensure it happens
        setTimeout(() => {
          if (window.GHAffiliate) {
            console.log('[AffiliateTracker] Manually triggering tracking');
            window.GHAffiliate.track();
          }
        }, 500);
      }
      
      // Call onLoad callback if provided
      if (onLoad) {
        onLoad();
      }
    } catch (error) {
      console.error('[AffiliateTracker] Error initializing affiliate tracker:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  return (
    <Script
      src="/js/affiliate-pixel.js"
      strategy="afterInteractive"
      onLoad={handleScriptLoad}
      onError={(e) => {
        console.error('[AffiliateTracker] Failed to load affiliate tracking script:', e);
        if (onError) {
          onError(new Error('Failed to load affiliate tracking script'));
        }
      }}
    />
  );
}

// Add global type for the affiliate tracker API
declare global {
  interface Window {
    GHAffiliate?: {
      init: (config?: {
        endpoint?: string;
        debug?: boolean;
        cookieName?: string;
        visitorCookieName?: string;
        cookieDuration?: number;
        requestTimeout?: number;
      }) => void;
      track: () => Promise<void>;
    };
  }
}
