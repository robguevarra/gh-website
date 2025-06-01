"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AffiliateTracker from '@/components/affiliate/affiliate-tracker';

type TrackerDebugInfo = {
  cookiesPresent: {
    affiliate: boolean;
    visitorId: boolean;
  };
  urlParams: Record<string, string>;
  userAgent: string;
  referrer: string;
};

/**
 * Test page for affiliate tracking system
 * This page demonstrates and tests the affiliate tracking functionality
 */
export default function AffiliateTrackingTestPage() {
  const searchParams = useSearchParams();
  const [debugInfo, setDebugInfo] = useState<TrackerDebugInfo | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  
  // Check for presence of affiliate parameter
  const hasAffiliateParam = searchParams.has('a') && Boolean(searchParams.get('a'));
  
  // Get all URL parameters for debugging
  const getUrlParams = () => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  };
  
  // Check for tracker cookies
  const checkCookies = () => {
    console.log('All cookies:', document.cookie);
    
    const cookies: Record<string, string> = {};
    document.cookie.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        cookies[name] = value;
      }
    });
    
    console.log('Parsed cookies:', cookies);
    console.log('Looking for gh_aff:', cookies['gh_aff']);
    console.log('Looking for gh_vid:', cookies['gh_vid']);
    
    return {
      affiliate: Boolean(cookies['gh_aff']),
      visitorId: Boolean(cookies['gh_vid']),
    };
  };
  
  // Update debug info
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDebugInfo({
        cookiesPresent: checkCookies(),
        urlParams: getUrlParams(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'None',
      });
      
      // Check again after a short delay to see if cookies were set
      const timer = setTimeout(() => {
        setDebugInfo(prev => ({
          ...prev!,
          cookiesPresent: checkCookies(),
        }));
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoaded, searchParams]);
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Affiliate Tracking Test Page</h1>
      
      {/* Status information */}
      <div className="bg-slate-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Tracking Status</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="font-medium">Affiliate Parameter:</div>
          <div className={hasAffiliateParam ? 'text-green-600' : 'text-red-600'}>
            {hasAffiliateParam ? '✅ Present' : '❌ Missing'}
          </div>
          
          <div className="font-medium">Tracker Script:</div>
          <div className={isLoaded ? 'text-green-600' : 'text-gray-600'}>
            {isLoaded ? '✅ Loaded' : '⏳ Loading...'}
          </div>
          
          {debugInfo && (
            <>
              <div className="font-medium">Affiliate Cookie:</div>
              <div className={debugInfo.cookiesPresent.affiliate ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.cookiesPresent.affiliate ? '✅ Set' : '❌ Not Set'}
              </div>
              
              <div className="font-medium">Visitor ID Cookie:</div>
              <div className={debugInfo.cookiesPresent.visitorId ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.cookiesPresent.visitorId ? '✅ Set' : '❌ Not Set'}
              </div>
            </>
          )}
          
          {hasError && (
            <>
              <div className="font-medium">Error:</div>
              <div className="text-red-600">{hasError}</div>
            </>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      {!hasAffiliateParam && (
        <div className="bg-yellow-100 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">Missing Affiliate Parameter</h2>
          <p className="mb-2">To test tracking, add <code>?a=test-affiliate</code> to the URL.</p>
          <p>
            <a 
              href="?a=test-affiliate" 
              className="text-blue-600 underline"
            >
              Click here to add test affiliate parameter
            </a>
          </p>
        </div>
      )}
      
      {/* Debug information */}
      {debugInfo && (
        <div className="bg-slate-100 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">Debug Information</h2>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-1">URL Parameters</h3>
            <pre className="bg-slate-200 p-2 rounded text-sm overflow-x-auto">
              {JSON.stringify(debugInfo.urlParams, null, 2)}
            </pre>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-1">Referrer</h3>
            <pre className="bg-slate-200 p-2 rounded text-sm overflow-x-auto">
              {debugInfo.referrer}
            </pre>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-1">User Agent</h3>
            <pre className="bg-slate-200 p-2 rounded text-sm overflow-x-auto">
              {debugInfo.userAgent}
            </pre>
          </div>
        </div>
      )}
      
      {/* Network request monitoring */}
      <div className="bg-slate-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Network Request</h2>
        <p className="mb-2">
          Check your browser's developer tools (Network tab) for a request to <code>/api/affiliate/click</code>
        </p>
        <p className="text-sm text-slate-600">
          If tracking is working correctly, you should see a 1x1 pixel GIF image response.
        </p>
      </div>
      
      {/* Manual tracking test - Only shown on client */}
      {typeof window !== 'undefined' && window?.GHAffiliate && (
        <div className="bg-slate-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Manual Tracking</h2>
          <button
            onClick={() => {
              if (window.GHAffiliate) {
                window.GHAffiliate.track();
                setTimeout(() => {
                  setDebugInfo(prev => ({
                    ...prev!,
                    cookiesPresent: checkCookies(),
                  }));
                }, 1000);
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Trigger Tracking Manually
          </button>
          <p className="mt-2 text-sm text-slate-600">
            Use this button to manually trigger the tracking pixel without reloading the page.
          </p>
        </div>
      )}
      
      {/* Include the tracking pixel */}
      <AffiliateTracker 
        debug={true}
        onLoad={() => setIsLoaded(true)}
        onError={(error) => setHasError(error.message)}
      />
    </div>
  );
}
