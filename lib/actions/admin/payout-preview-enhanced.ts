import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Enhanced payout preview that shows who will and won't get paid this month
 */
export interface MonthlyPayoutPreview {
  eligible_affiliates: {
    affiliate_id: string;
    affiliate_name: string;
    affiliate_email: string;
    total_cleared: number;
    conversion_count: number;
    has_payment_details: boolean;
    is_verified: boolean;
    payout_method: 'bank_transfer' | 'gcash';
    estimated_payout: number;
    fee_amount: number;
    net_amount: number;
  }[];
  
  ineligible_affiliates: {
    affiliate_id: string;
    affiliate_name: string;
    affiliate_email: string;
    total_cleared: number;
    conversion_count: number;
    rejection_reasons: string[];
    rollover_amount: number; // Amount that will carry to next month
    estimated_next_payout_date?: string;
  }[];
  
  summary: {
    total_eligible_affiliates: number;
    total_ineligible_affiliates: number;
    total_payout_amount: number;
    total_fee_amount: number;
    total_net_amount: number;
    total_rollover_amount: number;
    payout_period: string; // e.g., "2024-01"
    cutoff_date: string;
    processing_date: string;
  };
}

/**
 * Get comprehensive monthly payout preview showing eligible and ineligible affiliates
 */
export async function getMonthlyPayoutPreview(
  payoutPeriod?: string // Format: "2024-01", defaults to current month
): Promise<{
  preview: MonthlyPayoutPreview | null;
  error: string | null;
}> {
  const supabase = getAdminClient();
  
  try {
    // Default to current month if not specified
    const period = payoutPeriod || new Date().toISOString().slice(0, 7);
    const [year, month] = period.split('-');
    const startDate = `${year}-${month}-01`;
    
    // Calculate end date properly - last day of the month
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
    const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
    const endDate = new Date(nextYear, nextMonth - 1, 0).toISOString().slice(0, 10);
    
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
    
    // Get all cleared conversions not yet included in any batch
    const { data: conversions, error: conversionsError } = await supabase
      .from('affiliate_conversions')
      .select(`
        id,
        affiliate_id,
        commission_amount,
        created_at,
        affiliates!inner (
          id,
          account_holder_name,
          account_number,
          bank_name,
          gcash_number,
          gcash_name,
          bank_account_verified,
          gcash_verified,
          user_id,
          unified_profiles!fk_unified_profiles_affiliate_id!inner (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('status', 'cleared')
      .is('payout_id', null) // Not yet included in any batch
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59.999Z');
    
    if (conversionsError) {
      throw conversionsError;
    }
    
    // Group conversions by affiliate
    const affiliateGroups = new Map();
    
    conversions?.forEach(conversion => {
      const affiliateId = conversion.affiliate_id;
      if (!affiliateGroups.has(affiliateId)) {
        affiliateGroups.set(affiliateId, {
          affiliate: conversion.affiliates,
          conversions: [],
          total_amount: 0
        });
      }
      
      const group = affiliateGroups.get(affiliateId);
      group.conversions.push(conversion);
      group.total_amount += Number(conversion.commission_amount);
    });
    
    const eligibleAffiliates = [];
    const ineligibleAffiliates = [];
    let totalPayoutAmount = 0;
    let totalFeeAmount = 0;
    let totalRolloverAmount = 0;
    
    // Process each affiliate group
    for (const [affiliateId, group] of Array.from(affiliateGroups.entries())) {
      const affiliate = group.affiliate;
      const totalAmount = group.total_amount;
      const conversionCount = group.conversions.length;
      
      const affiliateName = `${affiliate.unified_profiles.first_name || ''} ${affiliate.unified_profiles.last_name || ''}`.trim();
      const affiliateEmail = affiliate.unified_profiles.email;
      
      // Determine preferred payout method
      const hasBank = !!(affiliate.account_holder_name && affiliate.account_number && affiliate.bank_name);
      const hasGcash = !!(affiliate.gcash_number && affiliate.gcash_name);
      
      let payoutMethod: 'bank_transfer' | 'gcash' | null = null;
      let hasPaymentDetails = false;
      let isVerified = false;
      
      if (hasBank && enabledMethods.includes('bank_transfer')) {
        payoutMethod = 'bank_transfer';
        hasPaymentDetails = true;
        isVerified = requireBankVerification ? affiliate.bank_account_verified : true;
      } else if (hasGcash && enabledMethods.includes('gcash')) {
        payoutMethod = 'gcash';
        hasPaymentDetails = true;
        isVerified = requireGcashVerification ? affiliate.gcash_verified : true;
      }
      
      // Validate eligibility
      const rejectionReasons = [];
      
      if (totalAmount < minThreshold) {
        rejectionReasons.push(`Amount ₱${totalAmount.toFixed(2)} below minimum threshold of ₱${minThreshold}`);
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
      
      // Calculate fees (assuming 2% fee)
      const feeRate = 0.02;
      const feeAmount = totalAmount * feeRate;
      const netAmount = totalAmount - feeAmount;
      
      if (rejectionReasons.length === 0) {
        // Eligible for payout
        eligibleAffiliates.push({
          affiliate_id: affiliateId,
          affiliate_name: affiliateName,
          affiliate_email: affiliateEmail,
          total_cleared: totalAmount,
          conversion_count: conversionCount,
          has_payment_details: hasPaymentDetails,
          is_verified: isVerified,
          payout_method: payoutMethod!,
          estimated_payout: totalAmount,
          fee_amount: feeAmount,
          net_amount: netAmount
        });
        
        totalPayoutAmount += totalAmount;
        totalFeeAmount += feeAmount;
      } else {
        // Ineligible - will rollover
        ineligibleAffiliates.push({
          affiliate_id: affiliateId,
          affiliate_name: affiliateName,
          affiliate_email: affiliateEmail,
          total_cleared: totalAmount,
          conversion_count: conversionCount,
          rejection_reasons: rejectionReasons,
          rollover_amount: totalAmount,
          estimated_next_payout_date: getNextPayoutDate(period)
        });
        
        totalRolloverAmount += totalAmount;
      }
    }
    
    // Calculate dates
    const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const cutoffDate = `${period}-${lastDayOfMonth.toString().padStart(2, '0')}`; // Last day of month
    const processingDate = getNextPayoutDate(period);
    
    const preview: MonthlyPayoutPreview = {
      eligible_affiliates: eligibleAffiliates,
      ineligible_affiliates: ineligibleAffiliates,
      summary: {
        total_eligible_affiliates: eligibleAffiliates.length,
        total_ineligible_affiliates: ineligibleAffiliates.length,
        total_payout_amount: totalPayoutAmount,
        total_fee_amount: totalFeeAmount,
        total_net_amount: totalPayoutAmount - totalFeeAmount,
        total_rollover_amount: totalRolloverAmount,
        payout_period: period,
        cutoff_date: cutoffDate,
        processing_date: processingDate
      }
    };
    
    return { preview, error: null };
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to generate monthly payout preview';
    console.error('getMonthlyPayoutPreview error:', errorMessage);
    console.error('Error details:', err);
    return { preview: null, error: errorMessage };
  }
}

/**
 * Calculate the next payout processing date (typically 5th of following month)
 */
function getNextPayoutDate(currentPeriod: string): string {
  const [year, month] = currentPeriod.split('-');
  const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
  
  return `${nextYear}-${nextMonth.toString().padStart(2, '0')}-05`; // 5th of next month
}

/**
 * Get affiliate rollover balances (amounts below threshold from previous months)
 */
export async function getAffiliateRolloverBalances(): Promise<{
  balances: Array<{
    affiliate_id: string;
    affiliate_name: string;
    affiliate_email: string;
    rollover_amount: number;
    months_accumulated: number;
    oldest_conversion_date: string;
  }>;
  error: string | null;
}> {
  const supabase = getAdminClient();
  
  try {
    // Get all cleared conversions not yet paid, grouped by affiliate
    const { data: conversions, error } = await supabase
      .from('affiliate_conversions')
      .select(`
        affiliate_id,
        commission_amount,
        created_at,
        affiliates!inner (
          unified_profiles!fk_unified_profiles_affiliate_id!inner (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('status', 'cleared')
      .is('payout_id', null);
    
    if (error) throw error;
    
    // Group by affiliate and calculate rollover amounts
    const affiliateBalances = new Map();
    
    conversions?.forEach(conversion => {
      const affiliateId = conversion.affiliate_id;
      if (!affiliateBalances.has(affiliateId)) {
        affiliateBalances.set(affiliateId, {
          affiliate: conversion.affiliates,
          total_amount: 0,
          conversion_dates: []
        });
      }
      
      const balance = affiliateBalances.get(affiliateId);
      balance.total_amount += Number(conversion.commission_amount);
      balance.conversion_dates.push(conversion.created_at);
    });
    
    const balances = Array.from(affiliateBalances.entries()).map(([affiliateId, data]) => {
      const sortedDates = data.conversion_dates.sort();
      const oldestDate = sortedDates[0];
      const newestDate = sortedDates[sortedDates.length - 1];
      
      // Calculate months between oldest and newest conversion
      const monthsAccumulated = Math.ceil(
        (new Date(newestDate).getTime() - new Date(oldestDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      return {
        affiliate_id: affiliateId,
        affiliate_name: `${data.affiliate.unified_profiles.first_name || ''} ${data.affiliate.unified_profiles.last_name || ''}`.trim(),
        affiliate_email: data.affiliate.unified_profiles.email,
        rollover_amount: data.total_amount,
        months_accumulated: Math.max(1, monthsAccumulated),
        oldest_conversion_date: oldestDate
      };
    });
    
    return { balances, error: null };
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to get rollover balances';
    return { balances: [], error: errorMessage };
  }
} 