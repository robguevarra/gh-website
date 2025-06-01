import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { NextRequest, NextResponse } from 'next/server';

// Import validation schemas
import { affiliateClickParamsSchema } from '@/lib/validation/affiliate/tracking-schema';

// Import service functions
import {
  createTrackingPixelResponse,
  extractIpAddress,
  extractUtmParams,
  generateVisitorId,
  parseUserAgent,
  recordAffiliateClick,
  setTrackingCookies,
  verifyAffiliate,
} from '@/lib/services/affiliate/tracking-service';

/**
 * Handle GET requests to the affiliate click tracking endpoint
 * This endpoint receives tracking requests from the JavaScript pixel,
 * validates the affiliate, and records the click in the database.
 */
export async function GET(request: NextRequest) {
  // Extract search parameters
  const searchParams = request.nextUrl.searchParams;
  const paramsData = Object.fromEntries(searchParams.entries());
  
  // Validate the parameters
  const validation = affiliateClickParamsSchema.safeParse(paramsData);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', issues: validation.error.flatten() },
      { status: 400 }
    );
  }
  
  const { a: slug } = validation.data;
  const utmParams = extractUtmParams({ searchParams });
  
  try {
    let supabaseClient;
    
    try {
      // Try to get the service role client first (bypasses RLS)
      supabaseClient = await createServiceRoleClient();
      // console.log('Using service role client for affiliate verification');
    } catch (error) {
      // console.log('Service role client unavailable, falling back to route handler client:', error);
      // Fall back to route handler client
      supabaseClient = await createRouteHandlerClient();
      // console.log('Using route handler client for affiliate verification');
    }
    
    // For testing: For now, let's simulate a successful verification instead of hitting the database
    // REMOVE THIS IN PRODUCTION - this is just for development testing without proper env vars
    const useTestMode = !process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // console.log('Verifying affiliate with slug:', slug);
    
    // Verify the affiliate slug exists and is active
    let affiliateId, status, verifyError;
    
    if (useTestMode) {
      // TEST MODE: Use a mock response for development testing
      // REMOVE THIS IN PRODUCTION - this is just for development without proper env vars
      // console.log('TEST MODE: Using mock affiliate data for', slug);
      affiliateId = '12345678-1234-1234-1234-123456789012'; // Mock UUID
      status = 'active';
      verifyError = null;
    } else {
      // NORMAL MODE: Verify against the database
      const result = await verifyAffiliate({
        supabase: supabaseClient,
        slug,
      });
      affiliateId = result.id;
      status = result.status;
      verifyError = result.error;
    }
    
    if (verifyError) {
      // console.error('Error verifying affiliate:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify affiliate' },
        { status: 500 }
      );
    }
    
    if (!affiliateId) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }
    
    // Check if affiliate is active
    if (status !== 'active') {
      return NextResponse.json(
        { error: 'Affiliate account is not active' },
        { status: 403 }
      );
    }
    
    // Extract request metadata
    const ipAddress = extractIpAddress({ request });
    const userAgentString = request.headers.get('user-agent');
    const referrerUrl = request.headers.get('referer') || null;
    
    // Get landingPage from query parameters or fallback to the API endpoint path
    const landingPagePath = searchParams.get('landingPage') || request.nextUrl.pathname;
    const landingPageUrl = request.nextUrl.origin + landingPagePath;
    
    // Parse user agent
    const userAgentData = parseUserAgent({ userAgentString });
    
    // Generate or retrieve visitor ID
    let visitorId = request.cookies.get('gh_vid')?.value;
    if (!visitorId) {
      visitorId = generateVisitorId();
    }
    
    // Record the click in the database
    let success = false;
    let clickError = null;
    
    if (useTestMode) {
      // TEST MODE: Mock a successful recording
      // REMOVE THIS IN PRODUCTION - this is just for development testing
      // console.log('TEST MODE: Simulating successful click recording');
      success = true;
    } else {
      // NORMAL MODE: Record in the database
      const result = await recordAffiliateClick({
        supabase: supabaseClient,
        clickData: {
          affiliate_id: affiliateId,
          visitor_id: visitorId,
          ip_address: ipAddress,
          user_agent: userAgentString,
          referral_url: referrerUrl,
          landing_page_url: landingPageUrl,
          user_agent_details: userAgentData,
          utm_params: Object.keys(utmParams).length > 0 ? utmParams : null,
        },
      });
      success = result.success;
      clickError = result.error;
    }
    
    if (!success) {
      // console.error('Error recording affiliate click:', clickError);
      return NextResponse.json(
        { error: 'Failed to record click' },
        { status: 500 }
      );
    }
    
    // Create response with the tracking pixel
    const response = createTrackingPixelResponse();
    
    // console.log('Setting cookies directly on the response object');
    
    // Set cookies directly on response to ensure they're set
    // 30 days for affiliate cookie
    response.cookies.set({
      name: 'gh_aff',
      value: slug,
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });
    
    // 1 year for visitor ID cookie
    response.cookies.set({
      name: 'gh_vid',
      value: visitorId,
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });
    
    // console.log('Cookies set on tracking pixel response');
    return response;
    
  } catch (error: any) {
    console.error('Unexpected error in affiliate click tracking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
