/**
 * Focused tests for cookie extraction utilities in the affiliate conversion service
 */
import { describe, it, expect, vi } from 'vitest';

// Extract the cookie parsing logic into a separate function for testing
const parseCookieHeader = (cookieHeader: string): Record<string, string> => {
  return Object.fromEntries(
    cookieHeader.split('; ').map(cookie => {
      const [name, ...rest] = cookie.split('=');
      return [name, rest.join('=')];
    }).filter(pair => pair[0] !== '')
  );
};

// Helper to extract specific cookies
const extractTrackingCookies = (cookieHeader: string): { affiliateSlug: string | null; visitorId: string | null } => {
  const cookies = parseCookieHeader(cookieHeader);
  const affiliateSlug = cookies['gh_aff'] || null;
  const visitorId = cookies['gh_vid'] || null;
  return { affiliateSlug, visitorId };
};

describe('Cookie Extraction Utilities', () => {
  describe('parseCookieHeader', () => {
    it('should parse cookie header into an object', () => {
      const cookieHeader = 'gh_aff=test-affiliate; gh_vid=test-visitor-id; other=value';
      const result = parseCookieHeader(cookieHeader);
      
      expect(result).toEqual({
        'gh_aff': 'test-affiliate',
        'gh_vid': 'test-visitor-id',
        'other': 'value'
      });
    });
    
    it('should handle empty cookie header', () => {
      const result = parseCookieHeader('');
      expect(result).toEqual({});
    });
    
    it('should handle malformed cookies', () => {
      const cookieHeader = 'gh_aff=test-affiliate; invalid-cookie; gh_vid=test-visitor-id';
      const result = parseCookieHeader(cookieHeader);
      
      expect(result).toEqual({
        'gh_aff': 'test-affiliate',
        'gh_vid': 'test-visitor-id',
        'invalid-cookie': ''
      });
    });
  });
  
  describe('extractTrackingCookies', () => {
    it('should extract affiliate slug and visitor ID from cookie header', () => {
      const cookieHeader = 'gh_aff=test-affiliate; gh_vid=test-visitor-id; other=value';
      const result = extractTrackingCookies(cookieHeader);
      
      expect(result.affiliateSlug).toBe('test-affiliate');
      expect(result.visitorId).toBe('test-visitor-id');
    });
    
    it('should return null values if tracking cookies are not present', () => {
      const cookieHeader = 'other=value; another=cookie';
      const result = extractTrackingCookies(cookieHeader);
      
      expect(result.affiliateSlug).toBeNull();
      expect(result.visitorId).toBeNull();
    });
    
    it('should handle empty cookie header', () => {
      const result = extractTrackingCookies('');
      
      expect(result.affiliateSlug).toBeNull();
      expect(result.visitorId).toBeNull();
    });
  });
});
