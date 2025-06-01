"use client";

import { useEffect } from 'react';
import Script from 'next/script';

/**
 * Global affiliate tracker component for site-wide tracking
 * This component is imported in the root layout
 */
export default function GlobalAffiliateTracker() {
  // Initialize tracking on mount
  useEffect(() => {
    // Check for affiliate parameter
    const params = new URLSearchParams(window.location.search);
    const affiliateSlug = params.get('a');
    
    if (affiliateSlug) {
      console.log('[Affiliate Tracker] Detected affiliate:', affiliateSlug);
      
      // Build tracking URL
      let trackingUrl = `/api/affiliate/click?a=${encodeURIComponent(affiliateSlug)}`;
      
      // Add UTM parameters if present
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
        if (params.has(param)) {
          trackingUrl += `&${param}=${encodeURIComponent(params.get(param) || '')}`;
        }
      });
      
      // Add cache buster
      trackingUrl += `&cb=${Date.now()}`;
      
      console.log('[Affiliate Tracker] Sending tracking request to:', trackingUrl);
      
      // Send request using fetch
      fetch(trackingUrl, { method: 'GET', credentials: 'include' })
        .then(response => {
          console.log('[Affiliate Tracker] Tracking response status:', response.status);
          return response.blob();
        })
        .then(() => {
          console.log('[Affiliate Tracker] Tracking request completed successfully');
        })
        .catch(error => {
          console.error('[Affiliate Tracker] Error sending tracking request:', error);
          
          // Fallback to image tracking
          const img = new Image(1, 1);
          img.style.display = 'none';
          img.src = trackingUrl;
          document.body.appendChild(img);
        });
    }
  }, []);
  
  return null;
}
