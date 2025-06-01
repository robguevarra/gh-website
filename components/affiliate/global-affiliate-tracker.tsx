"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * GlobalAffiliateTracker - Client component for tracking affiliate clicks
 * 
 * This is a simplified, direct implementation that uses fetch to track affiliate clicks
 * without relying on external JavaScript files.
 */
export default function GlobalAffiliateTracker({
  debug = false,  // Set to false by default for production
}: {
  debug?: boolean;
}) {
  const searchParams = useSearchParams();

  // Check for affiliate parameter
  const affiliateSlug = searchParams.get('a') || '';
  const hasAffiliateParam = Boolean(affiliateSlug);

  // Extract other UTM params if present
  const utm_source = searchParams.get('utm_source') || '';
  const utm_medium = searchParams.get('utm_medium') || '';
  const utm_campaign = searchParams.get('utm_campaign') || '';
  const utm_content = searchParams.get('utm_content') || '';
  const utm_term = searchParams.get('utm_term') || '';

  useEffect(() => {
    // Only track if we have an affiliate parameter
    if (!hasAffiliateParam) {
      if (debug) console.log('No affiliate parameter found, skipping tracking');
      return;
    }

    if (debug) console.log(`Tracking affiliate click for: ${affiliateSlug}`);
    
    // Direct tracking with fetch
    const trackAffiliate = async () => {
      try {
        // Build the tracking URL with all parameters
        const params = new URLSearchParams();
        params.append('a', affiliateSlug);
        if (utm_source) params.append('utm_source', utm_source);
        if (utm_medium) params.append('utm_medium', utm_medium);
        if (utm_campaign) params.append('utm_campaign', utm_campaign);
        if (utm_content) params.append('utm_content', utm_content);
        if (utm_term) params.append('utm_term', utm_term);
        
        // Add the current page URL as the landing page
        const currentPath = window.location.pathname;
        params.append('landingPage', currentPath);
        
        params.append('cb', Date.now().toString()); // Cache buster
        
        const trackingUrl = `/api/affiliate/click?${params.toString()}`;
        
        // Make the request
        const response = await fetch(trackingUrl, {
          method: 'GET',
          credentials: 'include', // Important for cookies
          cache: 'no-store',
        });
        
        if (!response.ok) {
          if (debug) console.error(`Tracking failed with status: ${response.status}`);
          return;
        }
        
        if (debug) console.log('Affiliate tracking successful');
        
        // Only check cookies in debug mode
        if (debug) {
          setTimeout(() => {
            const cookies = document.cookie;
            const hasAffCookie = cookies.includes('gh_aff=');
            const hasVidCookie = cookies.includes('gh_vid=');
          }, 500);
        }
        
      } catch (error) {
        console.error('Error tracking affiliate click:', error);
      }
    };
    
    // Execute tracking after a short delay to ensure page is ready
    setTimeout(trackAffiliate, 300);
    
  }, [hasAffiliateParam, affiliateSlug, utm_source, utm_medium, utm_campaign, utm_content, utm_term, debug]);

  // This component doesn't render anything visible
  return null;
}
