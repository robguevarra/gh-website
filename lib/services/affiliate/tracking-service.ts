import { UAParser } from 'ua-parser-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  AffiliateClickInsert,
  TrackingCookieOptions,
  UserAgentDetails,
  UtmParams,
} from '@/lib/validation/affiliate/tracking-schema';

// Add type declaration for NextRequest with IP
declare module 'next/server' {
  interface NextRequest {
    ip?: string;
  }
}

/**
 * Generate a unique visitor ID for tracking
 * @returns A UUID v4 compatible string
 */
export const generateVisitorId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Extract IP address from request with privacy considerations
 * @param params The request object
 * @returns The IP address or null
 */
export const extractIpAddress = ({ request }: { request: NextRequest }): string | null => {
  // Check for forwarded IP (when behind a proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take only the first IP in the list
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }
  
  // Fallback to NextRequest's IP (may be undefined)
  return request.ip || null;
};

/**
 * Parse user agent string into structured data
 * @param params The user agent string
 * @returns Structured user agent data
 */
export const parseUserAgent = ({ 
  userAgentString 
}: {
  userAgentString: string | null 
}): UserAgentDetails => {
  if (!userAgentString) {
    return {};
  }
  
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();
  
  return {
    browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    device: result.device.model ? `${result.device.vendor || ''} ${result.device.model || ''}`.trim() : 'Unknown',
  };
};

/**
 * Set affiliate tracking cookies in response
 * @param params Object containing response, slug, and visitorId
 * @returns The modified response with cookies
 */
export const setTrackingCookies = ({
  response,
  slug,
  visitorId,
}: {
  response: NextResponse;
  slug: string;
  visitorId: string;
}): NextResponse => {
  // 30 days in seconds for cookie expiration
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
  
  console.log('Setting tracking cookies:', { slug, visitorId });
  
  // Add cookies to response - setting them directly to ensure compatibility
  response.cookies.set({
    name: 'gh_aff',
    value: slug,
    maxAge: thirtyDaysInSeconds,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // Changed to false to allow JavaScript access for testing
    sameSite: 'lax'
  });
  
  response.cookies.set({
    name: 'gh_vid',
    value: visitorId,
    maxAge: 365 * 24 * 60 * 60, // 1 year for visitor tracking
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // Changed to false to allow JavaScript access for testing
    sameSite: 'lax'
  });
  
  console.log('Cookies set on response object');
  
  return response;
};

/**
 * Extract UTM parameters from search params
 * @param params Search parameters object
 * @returns Object with UTM parameters
 */
export const extractUtmParams = ({ 
  searchParams 
}: {
  searchParams: URLSearchParams 
}): UtmParams => {
  const utmParams: UtmParams = {};
  
  // Extract UTM parameters if they exist
  const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  
  utmFields.forEach(field => {
    const value = searchParams.get(field);
    if (value) {
      utmParams[field as keyof UtmParams] = value;
    }
  });
  
  return utmParams;
};

/**
 * Record an affiliate click in the database
 * @param params Object containing client and click data
 * @returns Success status and any error
 */
export const recordAffiliateClick = async ({
  supabase,
  clickData,
}: {
  supabase: SupabaseClient;
  clickData: AffiliateClickInsert;
}): Promise<{ success: boolean; error: Error | null }> => {
  try {
    
    // Check if supabase client is valid
    if (!supabase || typeof supabase.from !== 'function') {
      console.error('Invalid Supabase client provided to recordAffiliateClick');
      return { success: false, error: new Error('Database connection error') };
    }
    
    // Create object with all fields for the database schema including the new fields
    const dbCompatibleData = {
      affiliate_id: clickData.affiliate_id,
      visitor_id: clickData.visitor_id,
      ip_address: clickData.ip_address,
      user_agent: clickData.user_agent,
      referral_url: clickData.referral_url,
      // Include the new fields we added to the schema
      landing_page_url: clickData.landing_page_url,
      user_agent_details: clickData.user_agent_details,
      utm_params: clickData.utm_params,
    };
    
    const { error } = await supabase
      .from('affiliate_clicks')
      .insert(dbCompatibleData);
    
    if (error) {
      console.error('Supabase error recording click:', error);
      return { success: false, error: new Error(error.message) };
    }
    
    console.log('Click recorded successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error in recordAffiliateClick:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error recording click') 
    };
  }
};

/**
 * Verify an affiliate exists and is active
 * @param params Object containing client and slug
 * @returns The affiliate ID if found and active, null otherwise
 */
export const verifyAffiliate = async ({
  supabase,
  slug,
}: {
  supabase: SupabaseClient;
  slug: string;
}): Promise<{ id: string | null; status: string | null; error: Error | null }> => {
  try {
    console.log(`Verifying affiliate with slug: '${slug}'`);
    
    // Check if supabase client is valid
    if (!supabase || typeof supabase.from !== 'function') {
      console.error('Invalid Supabase client provided to verifyAffiliate');
      return { id: null, status: null, error: new Error('Database connection error') };
    }
    
    const { data, error } = await supabase
      .from('affiliates')
      .select('id, status')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error) {
      console.error('Supabase error verifying affiliate:', error);
      return { id: null, status: null, error: new Error(error.message) };
    }
    
    if (!data) {
      console.log(`No affiliate found with slug: '${slug}'`);
      return { id: null, status: null, error: new Error('Affiliate not found') };
    }
    
    console.log(`Affiliate found: id=${data.id}, status=${data.status}`);
    return { id: data.id, status: data.status, error: null };
  } catch (error) {
    console.error('Unexpected error in verifyAffiliate:', error);
    return { 
      id: null, 
      status: null, 
      error: error instanceof Error ? error : new Error('Unknown error verifying affiliate') 
    };
  }
};

/**
 * Create a transparent 1x1 pixel GIF response
 * @returns NextResponse with GIF image
 */
export const createTrackingPixelResponse = (): NextResponse => {
  // Transparent 1x1 pixel GIF (base64 encoded)
  const transparentPixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  
  return new NextResponse(transparentPixel, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
};

/**
 * Extract affiliate tracking cookies from server-side cookies (for checkout)
 * @returns Object containing affiliate slug and visitor ID from server-side cookies
 */
export const extractAffiliateTrackingFromServerCookies = (): { affiliateSlug: string | null; visitorId: string | null } => {
  try {
    const { cookies } = require('next/headers');
    const cookieStore = cookies();
    
    const affiliateSlug = cookieStore.get('gh_aff')?.value || null;
    const visitorId = cookieStore.get('gh_vid')?.value || null;
    
    return { affiliateSlug, visitorId };
  } catch (error) {
    console.error('Error extracting affiliate cookies from server:', error);
    return { affiliateSlug: null, visitorId: null };
  }
};
