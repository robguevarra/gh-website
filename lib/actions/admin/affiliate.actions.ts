'use server';

import type { AffiliateClick, AffiliateConversion, ConversionStatusType, AdminAffiliatePayout, PayoutMethodType } from '@/types/admin/affiliate';
import { getAdminClient } from '@/lib/supabase/admin';
import { unstable_cache } from 'next/cache';

interface GetAffiliateClicksParams {
  affiliateId: string;
  currentPage: number;
  itemsPerPage: number;
  filters?: {
    source?: string;
    landingPage?: string;
  };
}

interface GetAffiliateClicksResult {
  data: AffiliateClick[] | null;
  error: string | null;
  totalCount: number;
}

/**
 * Fetches paginated affiliate clicks with optional filters
 * Cached with a 60-second revalidation period
 */
export async function getAffiliateClicks(params: GetAffiliateClicksParams): Promise<GetAffiliateClicksResult> {
  try {
    return await getAffiliateClicksWithCache(params);
  } catch (error) {
    console.error('Error in getAffiliateClicks wrapper:', error);
    return { data: [], error: 'Failed to fetch clicks', totalCount: 0 };
  }
}

// Cached implementation that's called by the exported function
const getAffiliateClicksWithCache = unstable_cache(
  async ({
  affiliateId,
  currentPage,
  itemsPerPage,
  filters = {},
}: GetAffiliateClicksParams): Promise<GetAffiliateClicksResult> => {
  try {
    const supabase = getAdminClient();

    const offset = (currentPage - 1) * itemsPerPage;

    let query = supabase
      .from('affiliate_clicks')
      .select('*', { count: 'exact' })
      .eq('affiliate_id', affiliateId);

    if (filters.source) {
      // Assuming 'source' in UI maps to 'referral_url' in DB for filtering
      query = query.ilike('referral_url', `%${filters.source}%`);
    }

    if (filters.landingPage) {
      // Assuming 'landing_page' in UI maps to 'landing_page_url' in DB for filtering
      query = query.ilike('landing_page_url', `%${filters.landingPage}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching affiliate clicks:', error);
      return { data: [], error: error.message, totalCount: 0 };
    }

    // The 'data' from Supabase query should align with AffiliateClick.
    // The type definition for AffiliateClick has 'landing_page' and 'source' as optional UI fields.
    // The database table 'affiliate_clicks' has 'landing_page_url' and 'referral_url'.
    // We might need to map these if the UI expects the 'source' and 'landing_page' fields directly populated.
    // For now, we assume the raw data is sufficient and can be processed/mapped client-side if needed, or types adjusted.
    return { data: data as AffiliateClick[], error: null, totalCount: count ?? 0 };

  } catch (err: any) {
    console.error('Unexpected error in getAffiliateClicks:', err);
    return { data: [], error: err.message || 'An unexpected error occurred', totalCount: 0 };
  }
},
['affiliate-clicks', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-clicks'] }
);

// Server action to fetch affiliate conversions

interface GetAffiliateConversionsParams {
  affiliateId: string;
  currentPage: number;
  itemsPerPage: number;
  filters?: {
    orderId?: string;
    status?: ConversionStatusType;
  };
}

interface GetAffiliateConversionsResult {
  data: AffiliateConversion[] | null;
  error: string | null;
  totalCount: number;
}

/**
 * Fetches paginated affiliate conversions with optional filters
 * Cached with a 60-second revalidation period
 */
export async function getAffiliateConversions(params: GetAffiliateConversionsParams): Promise<GetAffiliateConversionsResult> {
  try {
    return await getAffiliateConversionsWithCache(params);
  } catch (error) {
    console.error('Error in getAffiliateConversions wrapper:', error);
    return { data: [], error: 'Failed to fetch conversions', totalCount: 0 };
  }
}

// Cached implementation that's called by the exported function
const getAffiliateConversionsWithCache = unstable_cache(
  async ({
  affiliateId,
  currentPage,
  itemsPerPage,
  filters = {},
}: GetAffiliateConversionsParams): Promise<GetAffiliateConversionsResult> => {
  try {
    const supabase = getAdminClient();
    const offset = (currentPage - 1) * itemsPerPage;

    let query = supabase
      .from('affiliate_conversions')
      .select('*', { count: 'exact' })
      .eq('affiliate_id', affiliateId);

    if (filters.orderId) {
      query = query.ilike('order_id', `%${filters.orderId}%`);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching affiliate conversions:', error);
      return { data: [], error: error.message, totalCount: 0 };
    }

    return { data: data as AffiliateConversion[], error: null, totalCount: count ?? 0 };

  } catch (err: any) {
    console.error('Unexpected error in getAffiliateConversions:', err);
    return { data: [], error: err.message || 'An unexpected error occurred', totalCount: 0 };
  }
},
['affiliate-conversions', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-conversions'] }
);

// Server action to fetch affiliate payouts

interface GetAffiliatePayoutsParams {
  affiliateId: string;
  currentPage: number;
  itemsPerPage: number;
  filters?: {
    method?: PayoutMethodType;
    reference?: string;
  };
}

interface GetAffiliatePayoutsResult {
  data: AdminAffiliatePayout[] | null;
  error: string | null;
  totalCount: number;
}

/**
 * Fetches paginated affiliate payouts with optional filters
 * Cached with a 60-second revalidation period
 */
export async function getAffiliatePayouts(params: GetAffiliatePayoutsParams): Promise<GetAffiliatePayoutsResult> {
  try {
    return await getAffiliatePayoutsWithCache(params);
  } catch (error) {
    console.error('Error in getAffiliatePayouts wrapper:', error);
    return { data: [], error: 'Failed to fetch payouts', totalCount: 0 };
  }
}

// Cached implementation that's called by the exported function
const getAffiliatePayoutsWithCache = unstable_cache(
  async ({
  affiliateId,
  currentPage,
  itemsPerPage,
  filters = {},
}: GetAffiliatePayoutsParams): Promise<GetAffiliatePayoutsResult> => {
  try {
    const supabase = getAdminClient();
    const offset = (currentPage - 1) * itemsPerPage;

    let query = supabase
      .from('affiliate_payouts')
      .select(`
        id,
        affiliate_id,
        amount,
        status,
        payout_method,
        reference,
        transaction_date,
        created_at,
        scheduled_at,
        processed_at,
        xendit_disbursement_id,
        processing_notes,
        fee_amount,
        net_amount,
        batch_id,
        affiliates (
          user_id,
          unified_profiles!affiliates_user_id_fkey (
            first_name,
            last_name,
            email
          )
        )
      `, { count: 'exact' })
      .eq('affiliate_id', affiliateId);

    if (filters.method) {
      query = query.eq('payout_method', filters.method);
    }

    if (filters.reference) {
      query = query.ilike('reference_id', `%${filters.reference}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching affiliate payouts:', error);
      return { data: null, error: error.message, totalCount: 0 };
    }

    // Transform the data to match AdminAffiliatePayout interface
    const transformedData: AdminAffiliatePayout[] = (data || []).map((p: any) => ({
      payout_id: p.id,
      affiliate_id: p.affiliate_id,
      affiliate_name: p.affiliates?.unified_profiles ? `${p.affiliates.unified_profiles.first_name || ''} ${p.affiliates.unified_profiles.last_name || ''}`.trim() || 'N/A' : 'N/A',
      affiliate_email: p.affiliates?.unified_profiles?.email || 'N/A',
      amount: p.amount,
      status: p.status,
      payout_method: p.payout_method || 'bank_transfer',
      reference: p.reference,
      transaction_date: p.transaction_date,
      created_at: p.created_at,
      scheduled_at: p.scheduled_at,
      processed_at: p.processed_at,
      xendit_disbursement_id: p.xendit_disbursement_id,
      processing_notes: p.processing_notes,
      fee_amount: p.fee_amount,
      net_amount: p.net_amount,
      batch_id: p.batch_id,
    }));

    return { data: transformedData, error: null, totalCount: count ?? 0 };

  } catch (err: any) {
    console.error('Unexpected error in getAffiliatePayouts:', err);
    return { data: null, error: err.message || 'An unexpected error occurred', totalCount: 0 };
  }
},
['affiliate-payouts', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-payouts'] }
);
