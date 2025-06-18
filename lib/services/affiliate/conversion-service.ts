import { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Define the conversion insert type matching actual database schema
type AffiliateConversionInsert = {
  affiliate_id: string;
  click_id: string | null;
  order_id: string;
  gmv: number;
  commission_amount: number; // Required field in database
  level?: number;
  sub_id?: string | null;
};

/**
 * Extract affiliate tracking cookies from the request headers (legacy method)
 * @param request The NextRequest object
 * @returns Object containing affiliate slug and visitor ID
 */
export const extractAffiliateTrackingCookies = (request: Request): { affiliateSlug: string | null; visitorId: string | null } => {
  try {
    // Extract cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(cookie => {
        const [name, ...rest] = cookie.split('=');
        return [name, rest.join('=')];
      }).filter(pair => pair[0] !== '')
    );
    
    const affiliateSlug = cookies['gh_aff'] || null;
    const visitorId = cookies['gh_vid'] || null;
    
    return { affiliateSlug, visitorId };
  } catch (error) {
    console.error('Error extracting affiliate tracking cookies:', error);
    return { affiliateSlug: null, visitorId: null };
  }
};

/**
 * Extract affiliate tracking data from transaction metadata
 * @param metadata Transaction metadata object
 * @returns Object containing affiliate slug and visitor ID
 */
export const extractAffiliateTrackingFromMetadata = (metadata: any): { affiliateSlug: string | null; visitorId: string | null } => {
  try {
    // Extract affiliate tracking from transaction metadata
    const affiliateTracking = metadata?.affiliateTracking;
    if (!affiliateTracking) {
      return { affiliateSlug: null, visitorId: null };
    }
    
    const affiliateSlug = affiliateTracking.affiliateSlug || null;
    const visitorId = affiliateTracking.visitorId || null;
    
    console.log(`[AffiliateTracking] Extracted from metadata: affiliate=${affiliateSlug}, visitor=${visitorId}`);
    
    return { affiliateSlug, visitorId };
  } catch (error) {
    console.error('Error extracting affiliate tracking from metadata:', error);
    return { affiliateSlug: null, visitorId: null };
  }
};

/**
 * Look up an affiliate by their slug
 * @param params.supabase SupabaseClient instance
 * @param params.slug Affiliate slug to look up
 * @returns Affiliate ID if found and active, null otherwise
 */
export const lookupAffiliateBySlug = async ({
  supabase,
  slug
}: {
  supabase: SupabaseClient;
  slug: string;
}): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('affiliates')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active') // Only active affiliates can earn commissions
      .maybeSingle();
    
    if (error) {
      console.error('Error looking up affiliate:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Unexpected error in lookupAffiliateBySlug:', error);
    return null;
  }
};

/**
 * Find the original click that led to this conversion
 * @param params Object containing Supabase client, affiliate ID, and visitor ID
 * @returns The click ID if found, null otherwise
 */
export const findAttributableClick = async ({
  supabase,
  affiliateId,
  visitorId,
}: {
  supabase: SupabaseClient;
  affiliateId: string;
  visitorId: string;
}): Promise<{ clickId: string | null; subId: string | null }> => {
  try {
    // Look for the most recent click from this visitor for this affiliate
    const { data, error } = await supabase
      .from('affiliate_clicks')
      .select('id, sub_id')
      .eq('affiliate_id', affiliateId)
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error finding attributable click:', error);
      return { clickId: null, subId: null };
    }
    
    return { 
      clickId: data?.id || null,
      subId: data?.sub_id || null
    };
  } catch (error) {
    console.error('Unexpected error in findAttributableClick:', error);
    return { clickId: null, subId: null };
  }
};

/**
 * Record an affiliate conversion in the database
 * @param params Object containing Supabase client and conversion data
 * @returns Success status and conversion ID if successful
 */
export const recordAffiliateConversion = async ({
  supabase,
  conversionData,
}: {
  supabase: SupabaseClient;
  conversionData: AffiliateConversionInsert;
}): Promise<{ success: boolean; conversionId: string | null; error: Error | null }> => {
  try {
    // Check if this order_id already has a conversion record (idempotency)
    const { data: existingConversion, error: checkError } = await supabase
      .from('affiliate_conversions')
      .select('id')
      .eq('order_id', conversionData.order_id)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing conversion:', checkError);
      return { success: false, conversionId: null, error: new Error(checkError.message) };
    }
    
    // If a conversion already exists for this order, return it
    if (existingConversion) {
      console.log(`Conversion already exists for order ${conversionData.order_id}`);
      return { success: true, conversionId: existingConversion.id, error: null };
    }
    
    // Insert the new conversion record
    const { data, error } = await supabase
      .from('affiliate_conversions')
      .insert({
        affiliate_id: conversionData.affiliate_id,
        click_id: conversionData.click_id,
        order_id: conversionData.order_id,
        gmv: conversionData.gmv,
        commission_amount: conversionData.commission_amount, // Required field
        level: conversionData.level || 1, // Default to level 1
        status: 'pending', // Always start as pending
        sub_id: conversionData.sub_id
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error recording affiliate conversion:', error);
      return { success: false, conversionId: null, error: new Error(error.message) };
    }
    
    return { success: true, conversionId: data.id, error: null };
  } catch (error) {
    console.error('Unexpected error in recordAffiliateConversion:', error);
    return { 
      success: false, 
      conversionId: null, 
      error: error instanceof Error ? error : new Error('Unknown error recording conversion') 
    };
  }
};

/**
 * Create a network postback record for network partner conversions
 * @param params Object containing Supabase client, conversion ID, network name, and sub ID
 * @returns Success status
 */
export const createNetworkPostback = async ({
  supabase,
  conversionId,
  networkName,
  subId,
  postbackUrl,
}: {
  supabase: SupabaseClient;
  conversionId: string;
  networkName: string;
  subId: string | null;
  postbackUrl: string;
}): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('network_postbacks')
      .insert({
        conversion_id: conversionId,
        network_name: networkName,
        sub_id: subId,
        postback_url: postbackUrl,
        status: 'pending'
      });
    
    if (error) {
      console.error('Error creating network postback record:', error);
      return { success: false, error: new Error(error.message) };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error in createNetworkPostback:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error creating network postback') 
    };
  }
};
