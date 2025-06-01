/**
 * Graceful Homeschooling Affiliate Tracking Pixel
 * Lightweight, asynchronous tracking script for affiliate attribution
 * 
 * Last updated: May 31, 2025
 */
(function() {
  'use strict';

  // Configuration (can be overridden when initializing)
  const defaultConfig = {
    endpoint: '/api/affiliate/click',
    debug: false,
    cookieName: 'gh_aff',
    visitorCookieName: 'gh_vid',
    cookieDuration: 30, // days
    requestTimeout: 5000, // milliseconds
  };

  // Store initialization state
  let isInitialized = false;
  let currentConfig = { ...defaultConfig };

  /**
   * Safely logs messages when debug mode is enabled
   */
  const log = (...args) => {
    if (currentConfig.debug && window.console) {
      console.log('[GH-Affiliate]', ...args);
    }
  };

  /**
   * Extracts URL parameters
   * @returns {Object} Key-value pairs of URL parameters
   */
  const getUrlParams = () => {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    return params;
  };

  /**
   * Checks if an affiliate parameter exists in the URL
   * @returns {boolean} True if affiliate parameter exists
   */
  const hasAffiliateParam = () => {
    const params = getUrlParams();
    return params.hasOwnProperty('a') && params.a;
  };

  /**
   * Creates a tracking pixel image element
   * @param {string} url - The tracking endpoint URL with parameters
   * @returns {HTMLImageElement} The image element
   */
  const createTrackingPixel = (url) => {
    const img = new Image(1, 1);
    img.style.display = 'none';
    img.referrerPolicy = 'no-referrer-when-downgrade';
    img.src = url;
    return img;
  };

  /**
   * Uses fetch API to send tracking data (for modern browsers)
   * @param {string} url - The tracking endpoint URL with parameters
   * @returns {Promise} Resolves when tracking is complete
   */
  const trackWithFetch = async (url) => {
    try {
      log('Attempting fetch tracking to:', url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), currentConfig.requestTimeout);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Accept': 'image/gif',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Tracking failed: ${response.status}`);
      }
      
      log('Tracking successful (fetch method)');
      return true;
    } catch (error) {
      log('Fetch tracking error:', error.message);
      return false;
    }
  };

  /**
   * Uses image fallback for tracking (for older browsers or when fetch fails)
   * @param {string} url - The tracking endpoint URL with parameters
   * @returns {Promise} Resolves when tracking is complete
   */
  const trackWithImage = () => {
    return new Promise((resolve) => {
      const img = createTrackingPixel(buildTrackingUrl());
      
      img.onload = () => {
        log('Tracking successful (image method)');
        resolve(true);
      };
      
      img.onerror = () => {
        log('Image tracking error');
        resolve(false);
      };
      
      // Add to DOM temporarily
      document.body.appendChild(img);
      setTimeout(() => img.remove(), 10000);
    });
  };

  /**
   * Builds the complete tracking URL with all parameters
   * @returns {string} The full tracking URL
   */
  const buildTrackingUrl = () => {
    const params = getUrlParams();
    const baseUrl = window.location.origin + currentConfig.endpoint;
    const urlParams = new URLSearchParams();
    
    // Always include the affiliate code
    if (params.a) {
      urlParams.append('a', params.a);
    }
    
    // Add referrer if available
    if (document.referrer) {
      urlParams.append('ref', document.referrer);
    }
    
    // Add UTM parameters if they exist
    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    utmParams.forEach(param => {
      if (params[param]) {
        urlParams.append(param, params[param]);
      }
    });
    
    // Add cache buster
    urlParams.append('cb', Date.now());
    
    return `${baseUrl}?${urlParams.toString()}`;
  };

  /**
   * Main tracking function that attempts to track using fetch first, then falls back to image
   */
  const trackAffiliate = async () => {
    if (!hasAffiliateParam()) {
      log('No affiliate parameter found, skipping tracking');
      return;
    }
    
    log('Tracking affiliate click...');
    
    try {
      // Try fetch first (modern browsers)
      const fetchSuccess = await trackWithFetch(buildTrackingUrl());
      
      // Fall back to image tracking if fetch fails
      if (!fetchSuccess) {
        log('Fetch tracking failed, falling back to image method');
        await trackWithImage();
      }
    } catch (error) {
      log('Tracking error:', error);
      // Final fallback - just load the image directly
      createTrackingPixel(buildTrackingUrl());
    }
  };

  /**
   * Initializes the tracking pixel with configuration options
   * @param {Object} config - Configuration options to override defaults
   */
  const init = (config = {}) => {
    if (isInitialized) {
      log('Tracking pixel already initialized');
      return;
    }
    
    // Merge configurations
    currentConfig = { ...defaultConfig, ...config };
    log('Initializing with config:', currentConfig);
    
    // Track affiliate click (defer execution slightly to not block page load)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(trackAffiliate, 0);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(trackAffiliate, 0);
      });
    }
    
    isInitialized = true;
  };

  // Expose the API globally
  window.GHAffiliate = {
    init,
    track: trackAffiliate,
  };
  
  // Auto-initialize if affiliate parameter is in URL
  if (hasAffiliateParam()) {
    init();
  }
})();
