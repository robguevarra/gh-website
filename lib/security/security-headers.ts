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
}

// Default CSP directive
const DEFAULT_CSP = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.googletagmanager.com https://editor.unlayer.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://editor.unlayer.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://api.stripe.com https://editor.unlayer.com https://drive.google.com https://docs.google.com;
  frame-src 'self' https://js.stripe.com https://editor.unlayer.com https://drive.google.com https://docs.google.com https://view.officeapps.live.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  block-all-mixed-content;
  upgrade-insecure-requests;
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
};

/**
 * Create a security headers middleware with the given configuration
 */
export function createSecurityHeaders(config: SecurityHeadersConfig = {}) {
  // Merge default config with provided config
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  return function securityHeadersMiddleware(_request: NextRequest, response: NextResponse) {
    // Content-Security-Policy
    if (mergedConfig.contentSecurityPolicy) {
      const cspValue = typeof mergedConfig.contentSecurityPolicy === 'string'
        ? mergedConfig.contentSecurityPolicy
        : DEFAULT_CSP;
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
    
    // X-Frame-Options
    if (mergedConfig.frameOptions) {
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
