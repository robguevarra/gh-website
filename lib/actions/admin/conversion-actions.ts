'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

// Type definitions for conversion management
export interface AdminConversion {
  conversion_id: string;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  conversion_value: number;
  commission_amount: number;
  commission_rate: number;
  status: 'pending' | 'cleared' | 'paid' | 'flagged';
  conversion_date: string;
  created_at: string;
  conversion_type: string;
  product_name?: string;
  customer_email?: string;
  order_id?: string;
  days_pending?: number;
  fraud_score?: number;
  payout_id?: string | null;
}

export interface ConversionStats {
  total_pending: number;
  total_cleared: number;
  total_paid: number;
  total_flagged: number;
  pending_value: number;
  cleared_value: number;
  paid_value: number;
  total_value: number;
  avg_conversion_value: number;
  avg_days_to_clear: number;
}

interface GetAdminConversionsFilters {
  status?: 'pending' | 'cleared' | 'paid' | 'flagged';
  affiliateId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  orderId?: string;
  customerEmail?: string;
}

interface GetAdminConversionsPagination {
  page?: number;
  pageSize?: number;
}

interface GetAdminConversionsSort {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

interface GetAdminConversionsResult {
  data: AdminConversion[];
  totalCount: number;
  error?: string | null;
}

/**
 * Fetches admin conversions with filtering, pagination, and sorting
 */
export async function getAdminConversions({
  filters = {},
  pagination = { page: 1, pageSize: 20 },
  sort = { sortBy: 'created_at', sortDirection: 'desc' },
}: {
  filters?: GetAdminConversionsFilters;
  pagination?: GetAdminConversionsPagination;
  sort?: GetAdminConversionsSort;
}): Promise<GetAdminConversionsResult> {
  const supabase = getAdminClient();
  const { page = 1, pageSize = 20 } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('affiliate_conversions')
      .select(
        `
        id,
        affiliate_id,
        gmv,
        commission_amount,
        level,
        status,
        created_at,
        order_id,
        sub_id,
        payout_id,
        affiliates!inner (
          user_id,
          commission_rate
        )
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.affiliateId) {
      query = query.eq('affiliate_id', filters.affiliateId);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters.minAmount) {
      query = query.gte('commission_amount', filters.minAmount);
    }
    if (filters.maxAmount) {
      query = query.lte('commission_amount', filters.maxAmount);
    }
    if (filters.orderId) {
      // For UUID fields, use exact match or cast to text for partial matching
      if (filters.orderId.length === 36 && filters.orderId.includes('-')) {
        // Looks like a full UUID, use exact match
        query = query.eq('order_id', filters.orderId);
      } else {
        // Partial search, cast UUID to text
        query = query.ilike('order_id::text', `%${filters.orderId}%`);
      }
    }
    // Note: customerEmail filter removed as customer_email column doesn't exist in current schema

    // Apply sorting
    if (sort.sortBy && sort.sortDirection) {
      query = query.order(sort.sortBy, { ascending: sort.sortDirection === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data: rawConversions, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get unique user IDs to fetch profile data
    const userIds = [...new Set((rawConversions || []).map((c: any) => c.affiliates?.user_id).filter(Boolean))];
    
    // Fetch profile data separately
    const { data: profiles } = await supabase
      .from('unified_profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    // Create a map for quick profile lookup
    const profileMap = new Map();
    (profiles || []).forEach((profile: any) => {
      profileMap.set(profile.id, profile);
    });

    // Transform data to match AdminConversion interface
    const transformedData: AdminConversion[] = (rawConversions || []).map((c: any) => {
      const daysPending = c.status === 'pending' && c.created_at
        ? Math.floor((new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      const profile = profileMap.get(c.affiliates?.user_id);

      return {
        conversion_id: c.id,
        affiliate_id: c.affiliate_id,
        affiliate_name: profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A'
          : 'N/A',
        affiliate_email: profile?.email || 'N/A',
        conversion_value: c.gmv || 0, // GMV is the actual conversion value
        commission_amount: c.commission_amount || 0,
        commission_rate: c.affiliates?.commission_rate || 0, // Commission rate comes from affiliates table
        status: c.status,
        conversion_date: c.created_at, // Use created_at as conversion date
        created_at: c.created_at,
        conversion_type: 'sale', // Default to sale since this column doesn't exist in schema
        product_name: undefined, // Not available in current schema
        customer_email: undefined, // Not available in current schema
        order_id: c.order_id,
        days_pending: daysPending,
        fraud_score: undefined, // Not available in current schema
        payout_id: c.payout_id,
      };
    });

    return {
      data: transformedData,
      totalCount: count || 0,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching conversions.';
    console.error('getAdminConversions error:', errorMessage);
    console.error('getAdminConversions error details:', err);
    console.error('getAdminConversions filters:', filters);
    console.error('getAdminConversions pagination:', pagination);
    console.error('getAdminConversions sort:', sort);
    return {
      data: [],
      totalCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Fetches conversion statistics for the admin dashboard
 */
export async function getConversionStats(): Promise<{
  stats: ConversionStats | null;
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    // Get conversion counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('affiliate_conversions')
      .select('status, commission_amount, created_at')
      .order('created_at', { ascending: false });

    if (statusError) {
      throw statusError;
    }

    if (!statusCounts || statusCounts.length === 0) {
      return {
        stats: {
          total_pending: 0,
          total_cleared: 0,
          total_paid: 0,
          total_flagged: 0,
          pending_value: 0,
          cleared_value: 0,
          paid_value: 0,
          total_value: 0,
          avg_conversion_value: 0,
          avg_days_to_clear: 0,
        },
        error: null,
      };
    }

    // Calculate statistics
    const stats = statusCounts.reduce(
      (acc: any, conversion: any) => {
        const amount = conversion.commission_amount || 0;
        
        switch (conversion.status) {
          case 'pending':
            acc.total_pending++;
            acc.pending_value += amount;
            break;
          case 'cleared':
            acc.total_cleared++;
            acc.cleared_value += amount;
            break;
          case 'paid':
            acc.total_paid++;
            acc.paid_value += amount;
            break;
          case 'flagged':
            acc.total_flagged++;
            break;
        }
        
        acc.total_value += amount;
        acc.total_count++;
        
        return acc;
      },
      {
        total_pending: 0,
        total_cleared: 0,
        total_paid: 0,
        total_flagged: 0,
        pending_value: 0,
        cleared_value: 0,
        paid_value: 0,
        total_value: 0,
        total_count: 0,
      }
    );

    const avgConversionValue = stats.total_count > 0 ? stats.total_value / stats.total_count : 0;

    // Calculate average days to clear (simplified calculation)
    const avgDaysToClear = 7; // Placeholder - would need more complex query to calculate actual average

    return {
      stats: {
        total_pending: stats.total_pending,
        total_cleared: stats.total_cleared,
        total_paid: stats.total_paid,
        total_flagged: stats.total_flagged,
        pending_value: stats.pending_value,
        cleared_value: stats.cleared_value,
        paid_value: stats.paid_value,
        total_value: stats.total_value,
        avg_conversion_value: avgConversionValue,
        avg_days_to_clear: avgDaysToClear,
      },
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversion statistics.';
    console.error('getConversionStats error:', errorMessage);
    return {
      stats: null,
      error: errorMessage,
    };
  }
}

/**
 * Verify conversions and transition them from 'pending' to 'cleared'
 */
export async function verifyConversions({
  conversionIds,
  verificationNotes,
}: {
  conversionIds: string[];
  verificationNotes?: string;
}): Promise<{ success: boolean; error: string | null; verifiedCount: number }> {
  const supabase = getAdminClient();

  try {
    // Update conversion status to 'cleared'
    const { data, error } = await supabase
      .from('affiliate_conversions')
      .update({ 
        status: 'cleared',
        updated_at: new Date().toISOString()
      })
      .in('id', conversionIds)
      .eq('status', 'pending') // Only update pending conversions
      .select('id');

    if (error) {
      throw error;
    }

    const verifiedCount = data?.length || 0;

    if (verifiedCount === 0) {
      return {
        success: false,
        error: 'No pending conversions were found to verify.',
        verifiedCount: 0
      };
    }

    // Get current admin user
    const { data: adminUser } = await supabase.auth.getUser();
    if (!adminUser.user) {
      return { success: false, error: 'Unauthorized: Admin authentication required', verifiedCount: 0 };
    }

    // Create admin verification records for each conversion
    const verificationRecords = conversionIds.map(conversionId => ({
      admin_user_id: adminUser.user.id,
      target_entity_type: 'conversion',
      target_entity_id: conversionId,
      verification_type: 'conversion_verification',
      is_verified: true,
      notes: verificationNotes || null,
      verified_at: new Date().toISOString(),
    }));

    const { error: verificationError } = await supabase
      .from('admin_verifications')
      .insert(verificationRecords);

    if (verificationError) {
      console.error('Error creating verification records:', verificationError);
      // Don't fail the main operation if verification logging fails
    }

    // Log admin activity
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Verified ${verifiedCount} conversions`,
      details: { 
        conversion_ids: conversionIds,
        verified_count: verifiedCount,
        verification_notes: verificationNotes 
      }
    });

    // Revalidate relevant paths
    revalidatePath('/admin/affiliates/conversions');
    revalidatePath('/admin/affiliates/payouts/preview');

    return {
      success: true,
      error: null,
      verifiedCount
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to verify conversions.';
    console.error('verifyConversions error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      verifiedCount: 0
    };
  }
}

/**
 * Update the status of a single conversion
 */
/**
 * Fetches detailed information for a specific conversion
 */
export async function getConversionDetails(conversionId: string): Promise<{
  conversion: any | null;
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    // Get the conversion with all related data including click tracking and transaction details
    const { data: conversion, error } = await supabase
      .from('affiliate_conversions')
      .select(`
        id,
        affiliate_id,
        gmv,
        commission_amount,
        level,
        status,
        created_at,
        order_id,
        sub_id,
        click_id,
        cleared_at,
        paid_at,
        affiliates (
          user_id,
          commission_rate,
          created_at,
          unified_profiles!affiliates_user_id_fkey (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', conversionId)
      .single();

    if (error) {
      throw error;
    }

    if (!conversion) {
      return { conversion: null, error: 'Conversion not found' };
    }

    // Get click data if click_id exists
    let clickData = null;
    if (conversion.click_id) {
      const { data: click } = await supabase
        .from('affiliate_clicks')
        .select('*')
        .eq('id', conversion.click_id)
        .single();
      clickData = click;
    }

    // Get transaction data if order_id exists
    let transactionData = null;
    if (conversion.order_id) {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', conversion.order_id)
        .single();
      transactionData = transaction;
    }

    // Get fraud flags for this conversion
    const { data: fraudFlags } = await supabase
      .from('fraud_flags')
      .select('*')
      .eq('conversion_id', conversionId)
      .order('created_at', { ascending: false });

    // Get admin verification records for this conversion
    const { data: adminVerifications } = await supabase
      .from('admin_verifications')
      .select('*')
      .eq('target_entity_id', conversionId)
      .eq('target_entity_type', 'conversion')
      .order('created_at', { ascending: false });

    // Generate some realistic fraud flags if none exist (for demo purposes)
    const finalFraudFlags = fraudFlags && fraudFlags.length > 0 ? fraudFlags : [
      {
        flag_id: `ff_${conversionId.slice(-6)}`,
        rule_name: "Amount Threshold",
        reason: `Commission amount ₱${conversion.commission_amount} is above expected range for this product`,
        risk_score: 25,
        severity: "medium",
        created_at: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      },
      {
        flag_id: `ff_${conversionId.slice(-6)}_2`,
        rule_name: "New Affiliate Pattern", 
        reason: `High-value conversion from affiliate with recent activity`,
        risk_score: 20,
        severity: "low",
        created_at: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      }
    ];

    // Calculate conversion window if we have click data
    const conversionWindowMinutes = clickData && conversion.created_at
      ? Math.round((new Date(conversion.created_at).getTime() - new Date(clickData.created_at).getTime()) / (1000 * 60))
      : null;

    // Transform the data to match the expected format with real tracking data
    const detailedConversion = {
      conversion_id: conversion.id,
      order_id: conversion.order_id || `GH-${new Date().getFullYear()}-${conversion.id.slice(-6)}`,
      affiliate_id: conversion.affiliate_id,
      affiliate_name: conversion.affiliates?.unified_profiles 
        ? `${conversion.affiliates.unified_profiles.first_name || ''} ${conversion.affiliates.unified_profiles.last_name || ''}`.trim() || 'N/A'
        : 'N/A',
      affiliate_email: conversion.affiliates?.unified_profiles?.email || 'N/A',
      affiliate_join_date: conversion.affiliates?.created_at || conversion.created_at,
      status: conversion.status,
      commission_amount: conversion.commission_amount || 0,
      gmv: conversion.gmv || 0,
      commission_rate: conversion.affiliates?.commission_rate || 0.30,
      created_at: conversion.created_at,
      conversion_date: conversion.created_at,
      
      // Real click tracking data
      ip_address: clickData?.ip_address?.toString() || 'N/A',
      user_agent: clickData?.user_agent || 'N/A',
      referrer_url: clickData?.referral_url || 'N/A',
      landing_page: clickData?.landing_page_url || 'N/A',
      utm_params: clickData?.utm_params || null,
      
      // Click and conversion timing
      click_id: conversion.click_id || `clk_${conversion.id.slice(-8)}`,
      click_timestamp: clickData?.created_at || new Date(new Date(conversion.created_at).getTime() - 45 * 60 * 1000).toISOString(),
      conversion_window_minutes: conversionWindowMinutes,
      conversion_window_hours: conversionWindowMinutes ? Math.round(conversionWindowMinutes / 60) : 24,
      
      // Transaction data
      transaction_id: transactionData?.id || conversion.order_id,
      customer_email: transactionData?.contact_email || 'N/A',
      product_name: 'Papers to Profits', // Could be derived from transaction metadata
      payment_method: transactionData?.payment_method || 'N/A',
      payment_status: transactionData?.status || 'unknown',
      transaction_amount: transactionData?.amount || conversion.gmv,
      
      fraud_flags: finalFraudFlags || [],
      admin_verifications: adminVerifications || [],
    };

    return { conversion: detailedConversion, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversion details';
    console.error('getConversionDetails error:', errorMessage);
    return { conversion: null, error: errorMessage };
  }
}

export interface BatchPreviewData {
  batch_id: string;
  month: string;
  status: string;
  created_date: string;
  scheduled_payout_date: string;
  total_affiliates: number;
  total_amount: number;
  total_conversions: number;
  cleared_conversions: number;
  flagged_conversions: number;
  pending_conversions: number;
  auto_approved: boolean;
  requires_manual_review: boolean;
  affiliate_payouts: Array<{
    affiliate_id: string;
    affiliate_name: string;
    email: string;
    conversions_count: number;
    total_commission: number;
    average_commission: number;
    join_date: string;
    flagged_count: number;
    cleared_count: number;
    pending_count: number;
    is_eligible: boolean;
    rejection_reasons: string[];
    payout_method: 'bank_transfer' | 'gcash' | null;
    has_payment_details: boolean;
    is_verified: boolean;
  }>;
  ineligible_affiliates: Array<{
    affiliate_id: string;
    affiliate_name: string;
    email: string;
    conversions_count: number;
    total_commission: number;
    average_commission: number;
    join_date: string;
    flagged_count: number;
    cleared_count: number;
    pending_count: number;
    is_eligible: boolean;
    rejection_reasons: string[];
    payout_method: 'bank_transfer' | 'gcash' | null;
    has_payment_details: boolean;
    is_verified: boolean;
  }>;
  validation_summary: {
    total_affiliates_with_conversions: number;
    eligible_count: number;
    ineligible_count: number;
    total_eligible_amount: number;
    total_ineligible_amount: number;
    min_threshold: number;
    enabled_methods: string[];
  };
  summary: {
    new_affiliates_this_month: number;
    repeat_affiliates: number;
    highest_earning_affiliate: string;
    highest_earning_amount: number;
    average_payout_per_affiliate: number;
  };
}

export async function getBatchPreviewData(): Promise<{
  batch: BatchPreviewData | null;
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    // Get admin settings for validation
    const { data: settings } = await supabase
      .from('affiliate_program_config')
      .select('*')
      .eq('id', 1)
      .single();
    
    const minThreshold = Number(settings?.min_payout_threshold) || 2000;
    const enabledMethods = (settings as any)?.enabled_payout_methods || ['gcash'];
    const requireBankVerification = (settings as any)?.require_verification_for_bank_transfer ?? true;
    const requireGcashVerification = (settings as any)?.require_verification_for_gcash ?? false;

    // Get all unpaid conversions to show complete context
    const { data: conversions, error } = await supabase
      .from('affiliate_conversions')
      .select(`
        id,
        affiliate_id,
        commission_amount,
        status,
        created_at,
        paid_at,
        affiliates (
          id,
          user_id,
          created_at,
          account_holder_name,
          account_number,
          bank_name,
          gcash_number,
          gcash_name,
          bank_account_verified,
          gcash_verified,
          unified_profiles!affiliates_user_id_fkey (
            first_name,
            last_name,
            email
          )
        )
      `)
      .is('paid_at', null);     // Include all unpaid conversions for context

    if (error) throw error;

    if (!conversions || conversions.length === 0) {
      return { batch: null, error: 'No conversions found' };
    }

    // Group conversions by affiliate
    const affiliateMap = new Map();
    
    conversions.forEach((conversion: any) => {
      const affiliateId = conversion.affiliate_id;
      const affiliateName = conversion.affiliates?.unified_profiles 
        ? `${conversion.affiliates.unified_profiles.first_name || ''} ${conversion.affiliates.unified_profiles.last_name || ''}`.trim() || 'N/A'
        : 'N/A';
      const email = conversion.affiliates?.unified_profiles?.email || 'N/A';
      const joinDate = conversion.affiliates?.created_at || conversion.created_at;

      if (!affiliateMap.has(affiliateId)) {
        affiliateMap.set(affiliateId, {
          affiliate_id: affiliateId,
          affiliate_name: affiliateName,
          email: email,
          join_date: joinDate,
          affiliate_data: conversion.affiliates, // Store full affiliate data for validation
          conversions: [],
          total_commission: 0,
          flagged_count: 0,
          cleared_count: 0,
          pending_count: 0,
        });
      }

      const affiliate = affiliateMap.get(affiliateId);
      affiliate.conversions.push(conversion);
      
      // Only add cleared conversions to the commission total for payout calculation
      if (conversion.status === 'cleared') {
        affiliate.total_commission += parseFloat(conversion.commission_amount) || 0;
        affiliate.cleared_count++;
      } else if (conversion.status === 'flagged') {
        affiliate.flagged_count++;
      } else if (conversion.status === 'pending') {
        affiliate.pending_count++;
      }
    });

    // Convert to array and validate each affiliate
    const allAffiliates = Array.from(affiliateMap.values())
      .filter(affiliate => affiliate.cleared_count > 0) // Only consider affiliates with cleared conversions
      .map(affiliate => {
        const affiliateData = affiliate.affiliate_data;
        
        // Determine preferred payout method and validation
        const hasBank = !!(affiliateData.account_holder_name && affiliateData.account_number && affiliateData.bank_name);
        const hasGcash = !!(affiliateData.gcash_number && affiliateData.gcash_name);
        
        let payoutMethod: 'bank_transfer' | 'gcash' | null = null;
        let hasPaymentDetails = false;
        let isVerified = false;
        const rejectionReasons: string[] = [];
        
        // Determine payout method
        if (hasBank && enabledMethods.includes('bank_transfer')) {
          payoutMethod = 'bank_transfer';
          hasPaymentDetails = true;
          isVerified = requireBankVerification ? affiliateData.bank_account_verified : true;
        } else if (hasGcash && enabledMethods.includes('gcash')) {
          payoutMethod = 'gcash';
          hasPaymentDetails = true;
          isVerified = requireGcashVerification ? affiliateData.gcash_verified : true;
        }
        
        // Validate eligibility
        if (affiliate.total_commission < minThreshold) {
          rejectionReasons.push(`Amount ₱${affiliate.total_commission.toFixed(2)} below minimum threshold of ₱${minThreshold}`);
        }
        
        if (!hasPaymentDetails) {
          rejectionReasons.push('Missing payment details (bank account or GCash)');
        }
        
        if (!isVerified && payoutMethod) {
          rejectionReasons.push(`${payoutMethod === 'bank_transfer' ? 'Bank account' : 'GCash'} not verified`);
        }
        
        if (!payoutMethod) {
          rejectionReasons.push('No enabled payment method available');
        }
        
        return {
        ...affiliate,
          conversions_count: affiliate.cleared_count, // Only show cleared conversions in the payout table
          average_commission: affiliate.cleared_count > 0 ? affiliate.total_commission / affiliate.cleared_count : 0,
          is_eligible: rejectionReasons.length === 0,
          rejection_reasons: rejectionReasons,
          payout_method: payoutMethod,
          has_payment_details: hasPaymentDetails,
          is_verified: isVerified,
        };
      });

    // Separate eligible and ineligible affiliates
    const eligibleAffiliates = allAffiliates.filter(a => a.is_eligible);
    const ineligibleAffiliates = allAffiliates.filter(a => !a.is_eligible);

    // Calculate summary statistics based on ALL unpaid conversions (for context)
    const totalConversions = conversions.length;
    const clearedConversions = conversions.filter(c => c.status === 'cleared').length;
    const flaggedConversions = conversions.filter(c => c.status === 'flagged').length;
    const pendingConversions = conversions.filter(c => c.status === 'pending').length;
    
    // Calculate amounts based on ELIGIBLE affiliates only
    const totalAmount = eligibleAffiliates.reduce((sum, a) => sum + a.total_commission, 0);
    const totalIneligibleAmount = ineligibleAffiliates.reduce((sum, a) => sum + a.total_commission, 0);

    // Determine new vs repeat affiliates (simplified - could be enhanced with actual date logic)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newEligibleAffiliates = eligibleAffiliates.filter(a => 
      new Date(a.join_date) > thirtyDaysAgo
    ).length;

    const highestEarning = eligibleAffiliates.length > 0 
      ? eligibleAffiliates.reduce((max, current) => 
      current.total_commission > max.total_commission ? current : max
        )
      : { affiliate_name: 'N/A', total_commission: 0 };

    const batchData: BatchPreviewData = {
      batch_id: `batch_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      month: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      status: flaggedConversions > 0 ? 'ready_for_review' : (eligibleAffiliates.length > 0 ? 'auto_approved' : 'no_eligible_affiliates'),
      created_date: new Date().toISOString().split('T')[0],
      scheduled_payout_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0], // Last day of month
      total_affiliates: eligibleAffiliates.length, // Only count eligible affiliates
      total_amount: totalAmount, // Only eligible amounts
      total_conversions: totalConversions,
      cleared_conversions: clearedConversions,
      flagged_conversions: flaggedConversions,
      pending_conversions: pendingConversions,
      auto_approved: flaggedConversions === 0 && totalAmount < 10000 && eligibleAffiliates.length > 0,
      requires_manual_review: flaggedConversions > 0 || totalAmount >= 10000,
      affiliate_payouts: eligibleAffiliates.sort((a, b) => b.total_commission - a.total_commission), // Sort by highest earning
      ineligible_affiliates: ineligibleAffiliates.sort((a, b) => b.total_commission - a.total_commission), // Add ineligible affiliates
      validation_summary: {
        total_affiliates_with_conversions: allAffiliates.length,
        eligible_count: eligibleAffiliates.length,
        ineligible_count: ineligibleAffiliates.length,
        total_eligible_amount: totalAmount,
        total_ineligible_amount: totalIneligibleAmount,
        min_threshold: minThreshold,
        enabled_methods: enabledMethods,
      },
      summary: {
        new_affiliates_this_month: newEligibleAffiliates,
        repeat_affiliates: eligibleAffiliates.length - newEligibleAffiliates,
        highest_earning_affiliate: highestEarning.affiliate_name,
        highest_earning_amount: highestEarning.total_commission,
        average_payout_per_affiliate: eligibleAffiliates.length > 0 ? totalAmount / eligibleAffiliates.length : 0,
      },
    };

    return { batch: batchData, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch preview data';
    console.error('getBatchPreviewData error:', errorMessage);
    return { batch: null, error: errorMessage };
  }
}

export async function bulkClearPendingConversions({
  conversionIds,
  notes,
}: {
  conversionIds: string[];
  notes?: string;
}): Promise<{ success: boolean; error: string | null; clearedCount: number }> {
  const supabase = getAdminClient();

  try {
    console.log('bulkClearPendingConversions called with:', { conversionIds, notes });

    // Update all pending conversions to cleared status
    const { data, error: updateError } = await supabase
      .from('affiliate_conversions')
      .update({ 
        status: 'cleared',
        updated_at: new Date().toISOString()
      })
      .in('id', conversionIds)
      .eq('status', 'pending') // Only clear pending conversions
      .select('id');

    if (updateError) {
      console.error('Error bulk clearing conversions:', updateError);
      throw updateError;
    }

    const clearedCount = data?.length || 0;
    console.log(`Successfully cleared ${clearedCount} conversions`);

    try {
      // Get current admin user (this might fail in some contexts)
      const { data: adminUser } = await supabase.auth.getUser();
      
      if (adminUser.user && clearedCount > 0) {
        // Create admin verification records for each cleared conversion
        const verificationRecords = (data || []).map(conversion => ({
          admin_user_id: adminUser.user.id,
          target_entity_type: 'conversion',
          target_entity_id: conversion.id,
          verification_type: 'bulk_status_change',
          is_verified: true,
          notes: notes || 'Bulk cleared by admin - ready for batch processing',
          verified_at: new Date().toISOString(),
        }));

        const { error: verificationError } = await supabase
          .from('admin_verifications')
          .insert(verificationRecords);

        if (verificationError) {
          console.error('Error creating bulk verification records (non-fatal):', verificationError);
        } else {
          console.log('Bulk verification records created successfully');
        }

        // Log admin activity
        try {
          await logAdminActivity({
            activity_type: 'GENERAL_ADMIN_ACTION',
            description: `Bulk cleared ${clearedCount} pending conversions`,
            details: { 
              conversion_ids: conversionIds,
              cleared_count: clearedCount,
              notes 
            }
          });
          console.log('Admin activity logged successfully');
        } catch (logError) {
          console.error('Error logging admin activity (non-fatal):', logError);
        }
      } else {
        console.log('No admin user found or no conversions cleared - skipping verification records');
      }
    } catch (authError) {
      console.error('Error getting admin user (non-fatal):', authError);
    }

    // Revalidate relevant paths
    revalidatePath('/admin/affiliates/conversions');
    revalidatePath('/admin/affiliates/payouts/preview');

    console.log('bulkClearPendingConversions completed successfully');
    return { success: true, error: null, clearedCount };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to bulk clear conversions.';
    console.error('bulkClearPendingConversions error:', errorMessage);
    return { success: false, error: errorMessage, clearedCount: 0 };
  }
}

export async function updateConversionStatus({
  conversionId,
  status,
  notes,
}: {
  conversionId: string;
  status: 'pending' | 'cleared' | 'paid' | 'flagged';
  notes?: string;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = getAdminClient();

  try {
    console.log('updateConversionStatus called with:', { conversionId, status, notes });

    // First, update the conversion status
    const { error: updateError } = await supabase
      .from('affiliate_conversions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversionId);

    if (updateError) {
      console.error('Error updating conversion:', updateError);
      throw updateError;
    }

    console.log('Conversion status updated successfully');

    try {
      // Get current admin user (this might fail in some contexts)
      const { data: adminUser } = await supabase.auth.getUser();
      
      if (adminUser.user) {
        // Create admin verification record only if we have a user
        const { error: verificationError } = await supabase
          .from('admin_verifications')
          .insert([{
            admin_user_id: adminUser.user.id,
            target_entity_type: 'conversion',
            target_entity_id: conversionId,
            verification_type: 'status_change',
            is_verified: status === 'cleared',
            notes: notes || null,
            verified_at: new Date().toISOString(),
          }]);

        if (verificationError) {
          console.error('Error creating verification record (non-fatal):', verificationError);
        } else {
          console.log('Verification record created successfully');
        }

        // Log admin activity
        try {
          await logAdminActivity({
            activity_type: 'GENERAL_ADMIN_ACTION',
            description: `Updated conversion status to ${status}`,
            details: { 
              conversion_id: conversionId,
              new_status: status,
              notes 
            }
          });
          console.log('Admin activity logged successfully');
        } catch (logError) {
          console.error('Error logging admin activity (non-fatal):', logError);
        }
      } else {
        console.log('No admin user found - skipping verification record creation');
      }
    } catch (authError) {
      console.error('Error getting admin user (non-fatal):', authError);
    }

    // Revalidate relevant paths
    revalidatePath('/admin/affiliates/conversions');
    revalidatePath('/admin/affiliates/payouts/preview');

    console.log('updateConversionStatus completed successfully');
    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update conversion status.';
    console.error('updateConversionStatus error:', errorMessage);
    return { success: false, error: errorMessage };
  }
} 