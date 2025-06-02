/**
 * A mock version of the extractAffiliateTrackingCookies function for testing
 * This simulates how it should work based on the implementation we saw
 */
export const mockExtractAffiliateTrackingCookies = (request: Request): { affiliateSlug: string | null; visitorId: string | null } => {
  try {
    // Extract cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Debug output
    console.log('Cookie header:', cookieHeader);
    
    // Simple regex-based extraction for testing purposes
    const affiliateMatch = cookieHeader.match(/gh_aff=([^;\s]*)/); 
    const visitorMatch = cookieHeader.match(/gh_vid=([^;\s]*)/); 
    
    const affiliateSlug = affiliateMatch ? affiliateMatch[1] : null;
    const visitorId = visitorMatch ? visitorMatch[1] : null;
    
    console.log('Extracted cookies:', { affiliateSlug, visitorId });
    
    return { affiliateSlug, visitorId };
  } catch (error) {
    console.error('Error extracting affiliate tracking cookies:', error);
    return { affiliateSlug: null, visitorId: null };
  }
};
