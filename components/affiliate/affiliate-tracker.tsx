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
 * AffiliateTracker component for embedding the affiliate tracking pixel
 * 
 * This component loads the affiliate tracking script and initializes it with
 * the provided configuration. It only loads the script when needed (when an
 * affiliate parameter is present in the URL).
 */
export const AffiliateTracker = ({
  debug = false,
  endpoint = '/api/affiliate/click',
  onLoad,
  onError,
}: AffiliateTrackerProps) => {
  const [hasAffiliateParam, setHasAffiliateParam] = useState<boolean>(false);

  useEffect(() => {
    // Check if URL contains affiliate parameter
    const params = new URLSearchParams(window.location.search);
    const hasAffParam = params.has('a') && Boolean(params.get('a'));
  
    
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
      }
      
      // Call onLoad callback if provided
      if (onLoad) {
        onLoad();
      }
    } catch (error) {
      console.error('Error initializing affiliate tracker:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  return (
    <Script
      src="/js/affiliate-pixel.js"
      strategy="lazyOnload"
      onLoad={handleScriptLoad}
      onError={(e) => {
        console.error('Failed to load affiliate tracking script:', e);
        if (onError) {
          onError(new Error('Failed to load affiliate tracking script'));
        }
      }}
    />
  );
};

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

export default AffiliateTracker;
