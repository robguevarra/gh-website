/**
 * Security headers middleware
 * Implements various HTTP security headers to protect against common web vulnerabilities
 */

import { NextRequest, NextResponse } from 'next/server';

// Interface for security headers configuration
export interface SecurityHeadersConfig {
  // Content Security Policy
  contentSecurityPolicy?: boolean | string;
  // X-XSS-Protection header
  xssProtection?: boolean | string;
  // X-Content-Type-Options header
  contentTypeOptions?: boolean | string;
  // X-Frame-Options header
  frameOptions?: boolean | string;
  // Referrer-Policy header
  referrerPolicy?: boolean | string;
  // Permissions-Policy header
  permissionsPolicy?: boolean | string;
  // Strict-Transport-Security header
  strictTransportSecurity?: boolean | string;
  // Custom headers to add
  customHeaders?: Record<string, string>;
  // Allow Facebook embeds
  allowFacebookEmbeds?: boolean;
}

// Default CSP directive
const DEFAULT_CSP = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.googletagmanager.com https://editor.unlayer.com https://player.vimeo.com https://connect.facebook.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://editor.unlayer.com;
  img-src 'self' data: https: blob: https://i.vimeocdn.com https://*.vimeocdn.com https://*.facebook.com https://*.fbcdn.net;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://api.stripe.com https://editor.unlayer.com https://drive.google.com https://docs.google.com https://api.vimeo.com https://*.vimeocdn.com https://graph.facebook.com https://*.facebook.com;
  frame-src 'self' https://js.stripe.com https://editor.unlayer.com https://drive.google.com https://docs.google.com https://view.officeapps.live.com https://player.vimeo.com https://www.facebook.com https://*.facebook.com https://web.facebook.com;
  media-src 'self' https://*.vimeocdn.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  block-all-mixed-content;
  upgrade-insecure-requests;
`.replace(/\s+/g, ' ').trim();

// CSP directive that allows Facebook embeds
const FACEBOOK_FRIENDLY_CSP = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.googletagmanager.com https://editor.unlayer.com https://player.vimeo.com https://connect.facebook.net https://*.facebook.com https://staticxx.facebook.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://editor.unlayer.com https://*.facebook.com;
  img-src 'self' data: https: blob: https://i.vimeocdn.com https://*.vimeocdn.com https://*.facebook.com https://*.fbcdn.net https://scontent-*.fbcdn.net;
  font-src 'self' https://fonts.gstatic.com https://*.facebook.com;
  connect-src 'self' https://*.supabase.co https://api.stripe.com https://editor.unlayer.com https://drive.google.com https://docs.google.com https://api.vimeo.com https://*.vimeocdn.com https://graph.facebook.com https://*.facebook.com;
  frame-src 'self' https://js.stripe.com https://editor.unlayer.com https://drive.google.com https://docs.google.com https://view.officeapps.live.com https://player.vimeo.com https://www.facebook.com https://*.facebook.com https://web.facebook.com;
  media-src 'self' https://*.vimeocdn.com https://*.facebook.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s+/g, ' ').trim();

// Default security headers configuration
const DEFAULT_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy: DEFAULT_CSP,
  xssProtection: '1; mode=block',
  contentTypeOptions: 'nosniff',
  frameOptions: 'SAMEORIGIN',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: `
    camera=(),
    microphone=(),
    geolocation=(),
    interest-cohort=()
  `.replace(/\s+/g, ' ').trim(),
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  allowFacebookEmbeds: false,
};

/**
 * Create a security headers middleware with the given configuration
 */
export function createSecurityHeaders(config: SecurityHeadersConfig = {}) {
  // Merge default config with provided config
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  return function securityHeadersMiddleware(request: NextRequest, response: NextResponse) {
    // Check if we need to allow Facebook embeds based on the request path
    const needsFacebookEmbeds = mergedConfig.allowFacebookEmbeds || 
      request.nextUrl.pathname === '/' || 
      request.nextUrl.pathname === '/canva-order' ||
      request.nextUrl.pathname === '/p2p-order-form';
    
    // Content-Security-Policy
    if (mergedConfig.contentSecurityPolicy) {
      const cspValue = typeof mergedConfig.contentSecurityPolicy === 'string'
        ? mergedConfig.contentSecurityPolicy
        : (needsFacebookEmbeds ? FACEBOOK_FRIENDLY_CSP : DEFAULT_CSP);
      response.headers.set('Content-Security-Policy', cspValue);
    }
    
    // X-XSS-Protection
    if (mergedConfig.xssProtection) {
      const xssValue = typeof mergedConfig.xssProtection === 'string'
        ? mergedConfig.xssProtection
        : '1; mode=block';
      response.headers.set('X-XSS-Protection', xssValue);
    }
    
    // X-Content-Type-Options
    if (mergedConfig.contentTypeOptions) {
      const ctoValue = typeof mergedConfig.contentTypeOptions === 'string'
        ? mergedConfig.contentTypeOptions
        : 'nosniff';
      response.headers.set('X-Content-Type-Options', ctoValue);
    }
    
    // X-Frame-Options - Allow Facebook embeds by removing this header when needed
    if (mergedConfig.frameOptions && !needsFacebookEmbeds) {
      const frameValue = typeof mergedConfig.frameOptions === 'string'
        ? mergedConfig.frameOptions
        : 'SAMEORIGIN';
      response.headers.set('X-Frame-Options', frameValue);
    }
    
    // Referrer-Policy
    if (mergedConfig.referrerPolicy) {
      const referrerValue = typeof mergedConfig.referrerPolicy === 'string'
        ? mergedConfig.referrerPolicy
        : 'strict-origin-when-cross-origin';
      response.headers.set('Referrer-Policy', referrerValue);
    }
    
    // Permissions-Policy
    if (mergedConfig.permissionsPolicy) {
      const permissionsValue = typeof mergedConfig.permissionsPolicy === 'string'
        ? mergedConfig.permissionsPolicy
        : (typeof DEFAULT_CONFIG.permissionsPolicy === 'string' ? DEFAULT_CONFIG.permissionsPolicy : '');
      response.headers.set('Permissions-Policy', permissionsValue);
    }
    
    // Strict-Transport-Security
    if (mergedConfig.strictTransportSecurity) {
      const hstsValue = typeof mergedConfig.strictTransportSecurity === 'string'
        ? mergedConfig.strictTransportSecurity
        : 'max-age=63072000; includeSubDomains; preload';
      response.headers.set('Strict-Transport-Security', hstsValue);
    }
    
    // Custom headers
    if (mergedConfig.customHeaders) {
      for (const [name, value] of Object.entries(mergedConfig.customHeaders)) {
        response.headers.set(name, value);
      }
    }
    
    return response;
  };
}

// Export a default instance with standard configuration
export const securityHeaders = createSecurityHeaders();

// Export a Facebook-friendly instance for pages with social media embeds
export const facebookFriendlySecurityHeaders = createSecurityHeaders({
  allowFacebookEmbeds: true,
});

// Create a proper middleware function that matches the SecurityMiddleware type
export async function facebookFriendlySecurityMiddleware(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  return facebookFriendlySecurityHeaders(request, response);
}
