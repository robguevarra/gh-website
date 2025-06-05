'use server';

import type { AffiliateClick, AffiliateConversion, ConversionStatusType, AffiliatePayout, PayoutMethodType } from '@/types/admin/affiliate';
import { getAdminClient } from '@/lib/supabase/admin';

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

export async function getAffiliateClicks({
  affiliateId,
  currentPage,
  itemsPerPage,
  filters = {},
}: GetAffiliateClicksParams): Promise<GetAffiliateClicksResult> {
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
      return { data: null, error: error.message, totalCount: 0 };
    }

    // The 'data' from Supabase query should align with AffiliateClick.
    // The type definition for AffiliateClick has 'landing_page' and 'source' as optional UI fields.
    // The database table 'affiliate_clicks' has 'landing_page_url' and 'referral_url'.
    // We might need to map these if the UI expects the 'source' and 'landing_page' fields directly populated.
    // For now, we assume the raw data is sufficient and can be processed/mapped client-side if needed, or types adjusted.
    return { data: data as AffiliateClick[], error: null, totalCount: count ?? 0 };

  } catch (err: any) {
    console.error('Unexpected error in getAffiliateClicks:', err);
    return { data: null, error: err.message || 'An unexpected error occurred', totalCount: 0 };
  }
}

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

export async function getAffiliateConversions({
  affiliateId,
  currentPage,
  itemsPerPage,
  filters = {},
}: GetAffiliateConversionsParams): Promise<GetAffiliateConversionsResult> {
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
      return { data: null, error: error.message, totalCount: 0 };
    }

    return { data: data as AffiliateConversion[], error: null, totalCount: count ?? 0 };

  } catch (err: any) {
    console.error('Unexpected error in getAffiliateConversions:', err);
    return { data: null, error: err.message || 'An unexpected error occurred', totalCount: 0 };
  }
}

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
  data: AffiliatePayout[] | null;
  error: string | null;
  totalCount: number;
}

export async function getAffiliatePayouts({
  affiliateId,
  currentPage,
  itemsPerPage,
  filters = {},
}: GetAffiliatePayoutsParams): Promise<GetAffiliatePayoutsResult> {
  try {
    const supabase = getAdminClient();
    const offset = (currentPage - 1) * itemsPerPage;

    let query = supabase
      .from('affiliate_payouts')
      .select('*', { count: 'exact' })
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

    return { data: data as AffiliatePayout[], error: null, totalCount: count ?? 0 };

  } catch (err: any) {
    console.error('Unexpected error in getAffiliatePayouts:', err);
    return { data: null, error: err.message || 'An unexpected error occurred', totalCount: 0 };
  }
}
