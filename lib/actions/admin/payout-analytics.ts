import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Advanced analytics for monthly payout preview dashboard
 * Provides trend analysis, projections, and strategic insights
 */

export interface MonthlyTrendData {
  month: string;
  total_affiliates: number;
  eligible_affiliates: number;
  total_amount: number;
  eligible_amount: number;
  rollover_amount: number;
  avg_per_affiliate: number;
  conversion_count: number;
  new_affiliates: number;
}

export interface RolloverProjection {
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  current_amount: number;
  projected_monthly_growth: number;
  estimated_months_to_threshold: number;
  estimated_payout_date: string;
  confidence_level: 'high' | 'medium' | 'low';
  growth_trend: 'increasing' | 'stable' | 'decreasing';
}

export interface ThresholdImpactAnalysis {
  current_threshold: number;
  scenarios: Array<{
    threshold: number;
    eligible_affiliates: number;
    eligible_amount: number;
    rollover_amount: number;
    impact_description: string;
  }>;
}

export interface PaymentMethodGaps {
  missing_bank_details: Array<{
    affiliate_id: string;
    affiliate_name: string;
    affiliate_email: string;
    pending_amount: number;
    months_pending: number;
  }>;
  missing_gcash_details: Array<{
    affiliate_id: string;
    affiliate_name: string;
    affiliate_email: string;
    pending_amount: number;
    months_pending: number;
  }>;
  unverified_affiliates: Array<{
    affiliate_id: string;
    affiliate_name: string;
    affiliate_email: string;
    pending_amount: number;
    verification_status: string;
  }>;
}

/**
 * Get monthly trend data for the last 12 months
 */
export async function getMonthlyTrendAnalysis(): Promise<{
  trends: MonthlyTrendData[];
  insights: {
    growth_rate: number;
    avg_monthly_payout: number;
    peak_month: string;
    trend_direction: 'up' | 'down' | 'stable';
  };
  error?: string;
}> {
  const supabase = getAdminClient();
  
  try {
    // Get last 12 months of data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const { data: monthlyData, error } = await supabase
      .from('affiliate_conversions')
      .select(`
        created_at,
        commission_amount,
        status,
        affiliate_id,
        affiliates!inner (
          id,
          created_at,
          unified_profiles!inner (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('status', 'cleared')
      .gte('created_at', twelveMonthsAgo.toISOString());
    
    if (error) {
      return { trends: [], insights: { growth_rate: 0, avg_monthly_payout: 0, peak_month: '', trend_direction: 'stable' }, error: error.message };
    }
    
    // Group data by month
    const monthlyGroups: { [key: string]: any[] } = {};
    const affiliateFirstSeen: { [key: string]: string } = {};
    
    monthlyData?.forEach(conversion => {
      const month = conversion.created_at.slice(0, 7); // YYYY-MM format
      if (!monthlyGroups[month]) {
        monthlyGroups[month] = [];
      }
      monthlyGroups[month].push(conversion);
      
      // Track when we first saw each affiliate
      const affiliateId = conversion.affiliate_id;
      if (!affiliateFirstSeen[affiliateId] || conversion.created_at < affiliateFirstSeen[affiliateId]) {
        affiliateFirstSeen[affiliateId] = month;
      }
    });
    
    // Calculate trends for each month
    const trends: MonthlyTrendData[] = [];
    const sortedMonths = Object.keys(monthlyGroups).sort();
    
    for (const month of sortedMonths) {
      const conversions = monthlyGroups[month];
      const uniqueAffiliates = new Set(conversions.map(c => c.affiliate_id));
      const totalAmount = conversions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
      
      // Count new affiliates for this month
      const newAffiliates = Array.from(uniqueAffiliates).filter(
        affiliateId => affiliateFirstSeen[affiliateId] === month
      ).length;
      
      // Calculate eligible vs rollover (simplified - using 2000 threshold)
      const affiliateAmounts = Array.from(uniqueAffiliates).map(affiliateId => {
        const affiliateConversions = conversions.filter(c => c.affiliate_id === affiliateId);
        return affiliateConversions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
      });
      
      const eligibleAmounts = affiliateAmounts.filter(amount => amount >= 2000);
      const rolloverAmounts = affiliateAmounts.filter(amount => amount < 2000);
      
      trends.push({
        month,
        total_affiliates: uniqueAffiliates.size,
        eligible_affiliates: eligibleAmounts.length,
        total_amount: totalAmount,
        eligible_amount: eligibleAmounts.reduce((sum, amount) => sum + amount, 0),
        rollover_amount: rolloverAmounts.reduce((sum, amount) => sum + amount, 0),
        avg_per_affiliate: totalAmount / uniqueAffiliates.size,
        conversion_count: conversions.length,
        new_affiliates: newAffiliates
      });
    }
    
    // Calculate insights
    const recentTrends = trends.slice(-6); // Last 6 months
    const avgMonthlyPayout = recentTrends.reduce((sum, t) => sum + t.eligible_amount, 0) / recentTrends.length;
    
    let growthRate = 0;
    if (recentTrends.length >= 2) {
      const firstMonth = recentTrends[0].eligible_amount;
      const lastMonth = recentTrends[recentTrends.length - 1].eligible_amount;
      growthRate = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
    }
    
    const peakMonth = trends.reduce((peak, current) => 
      current.eligible_amount > peak.eligible_amount ? current : peak
    );
    
    const trendDirection = growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable';
    
    return {
      trends,
      insights: {
        growth_rate: growthRate,
        avg_monthly_payout: avgMonthlyPayout,
        peak_month: peakMonth.month,
        trend_direction: trendDirection
      }
    };
    
  } catch (error) {
    console.error('Error getting monthly trend analysis:', error);
    return {
      trends: [],
      insights: { growth_rate: 0, avg_monthly_payout: 0, peak_month: '', trend_direction: 'stable' },
      error: 'Failed to analyze monthly trends'
    };
  }
}

/**
 * Generate rollover projections for ineligible affiliates
 */
export async function getRolloverProjections(): Promise<{
  projections: RolloverProjection[];
  summary: {
    total_affiliates_in_rollover: number;
    total_rollover_amount: number;
    avg_months_to_threshold: number;
    next_month_graduates: number;
  };
  error?: string;
}> {
  const supabase = getAdminClient();
  
  try {
    // Get affiliates with cleared conversions below threshold
    const { data: rolloverAffiliates, error } = await supabase
      .from('affiliate_conversions')
      .select(`
        affiliate_id,
        commission_amount,
        created_at,
        affiliates!inner (
          id,
          unified_profiles!fk_unified_profiles_affiliate_id!inner (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('status', 'cleared')
      .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 6 months
    
    if (error) {
      return { 
        projections: [], 
        summary: { total_affiliates_in_rollover: 0, total_rollover_amount: 0, avg_months_to_threshold: 0, next_month_graduates: 0 },
        error: error.message 
      };
    }
    
    // Group by affiliate and calculate totals
    const affiliateData: { [key: string]: any } = {};
    
    rolloverAffiliates?.forEach(conversion => {
      const affiliateId = conversion.affiliate_id;
      if (!affiliateData[affiliateId]) {
        affiliateData[affiliateId] = {
          affiliate_id: affiliateId,
          affiliate_name: `${conversion.affiliates.unified_profiles.first_name} ${conversion.affiliates.unified_profiles.last_name}`,
          affiliate_email: conversion.affiliates.unified_profiles.email,
          conversions: [],
          total_amount: 0
        };
      }
      
      affiliateData[affiliateId].conversions.push({
        amount: Number(conversion.commission_amount),
        date: conversion.created_at
      });
      affiliateData[affiliateId].total_amount += Number(conversion.commission_amount);
    });
    
    // Filter to only those below threshold and calculate projections
    const projections: RolloverProjection[] = [];
    
    Object.values(affiliateData).forEach((affiliate: any) => {
      if (affiliate.total_amount < 2000) {
        // Calculate monthly growth trend
        const conversions = affiliate.conversions.sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Simple linear regression for growth trend
        const monthlyAmounts: { [key: string]: number } = {};
        conversions.forEach((conv: any) => {
          const month = conv.date.slice(0, 7);
          monthlyAmounts[month] = (monthlyAmounts[month] || 0) + conv.amount;
        });
        
        const months = Object.keys(monthlyAmounts).sort();
        const amounts = months.map(month => monthlyAmounts[month]);
        
        let projectedMonthlyGrowth = 0;
        let growthTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
        let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
        
        if (amounts.length >= 3) {
          // Calculate average monthly growth
          const growthRates = [];
          for (let i = 1; i < amounts.length; i++) {
            if (amounts[i - 1] > 0) {
              growthRates.push(amounts[i] - amounts[i - 1]);
            }
          }
          
          if (growthRates.length > 0) {
            projectedMonthlyGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
            
            if (projectedMonthlyGrowth > 50) {
              growthTrend = 'increasing';
              confidenceLevel = 'high';
            } else if (projectedMonthlyGrowth < -50) {
              growthTrend = 'decreasing';
              confidenceLevel = 'low';
            } else {
              growthTrend = 'stable';
              confidenceLevel = 'medium';
            }
          }
        }
        
        // Estimate months to threshold
        const remainingAmount = 2000 - affiliate.total_amount;
        let estimatedMonths = projectedMonthlyGrowth > 0 
          ? Math.ceil(remainingAmount / projectedMonthlyGrowth)
          : 12; // Default to 12 months if no growth
        
        // Cap at reasonable limits
        estimatedMonths = Math.min(Math.max(estimatedMonths, 1), 24);
        
        const estimatedPayoutDate = new Date();
        estimatedPayoutDate.setMonth(estimatedPayoutDate.getMonth() + estimatedMonths);
        
        projections.push({
          affiliate_id: affiliate.affiliate_id,
          affiliate_name: affiliate.affiliate_name,
          affiliate_email: affiliate.affiliate_email,
          current_amount: affiliate.total_amount,
          projected_monthly_growth: projectedMonthlyGrowth,
          estimated_months_to_threshold: estimatedMonths,
          estimated_payout_date: estimatedPayoutDate.toISOString().slice(0, 7),
          confidence_level: confidenceLevel,
          growth_trend: growthTrend
        });
      }
    });
    
    // Calculate summary
    const totalRolloverAmount = projections.reduce((sum, p) => sum + p.current_amount, 0);
    const avgMonthsToThreshold = projections.length > 0 
      ? projections.reduce((sum, p) => sum + p.estimated_months_to_threshold, 0) / projections.length
      : 0;
    const nextMonthGraduates = projections.filter(p => p.estimated_months_to_threshold <= 1).length;
    
    return {
      projections: projections.sort((a, b) => a.estimated_months_to_threshold - b.estimated_months_to_threshold),
      summary: {
        total_affiliates_in_rollover: projections.length,
        total_rollover_amount: totalRolloverAmount,
        avg_months_to_threshold: avgMonthsToThreshold,
        next_month_graduates: nextMonthGraduates
      }
    };
    
  } catch (error) {
    console.error('Error getting rollover projections:', error);
    return {
      projections: [],
      summary: { total_affiliates_in_rollover: 0, total_rollover_amount: 0, avg_months_to_threshold: 0, next_month_graduates: 0 },
      error: 'Failed to generate rollover projections'
    };
  }
}

/**
 * Analyze impact of different threshold scenarios
 */
export async function getThresholdImpactAnalysis(currentPeriod: string = new Date().toISOString().slice(0, 7)): Promise<{
  analysis: ThresholdImpactAnalysis;
  error?: string;
}> {
  const supabase = getAdminClient();
  
  try {
    // Get current month's cleared conversions
    const startDate = `${currentPeriod}-01`;
    const [year, month] = currentPeriod.split('-');
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
    const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
    const endDate = new Date(nextYear, nextMonth - 1, 0).toISOString().slice(0, 10);
    
    const { data: conversions, error } = await supabase
      .from('affiliate_conversions')
      .select(`
        affiliate_id,
        commission_amount,
        affiliates!inner (
          unified_profiles!fk_unified_profiles_affiliate_id!inner (
            first_name,
            last_name
          )
        )
      `)
      .eq('status', 'cleared')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59.999Z');
    
    if (error) {
      return { 
        analysis: { current_threshold: 2000, scenarios: [] },
        error: error.message 
      };
    }
    
    // Group by affiliate
    const affiliateAmounts: { [key: string]: number } = {};
    conversions?.forEach(conv => {
      const affiliateId = conv.affiliate_id;
      affiliateAmounts[affiliateId] = (affiliateAmounts[affiliateId] || 0) + Number(conv.commission_amount);
    });
    
    const amounts = Object.values(affiliateAmounts);
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    
    // Test different threshold scenarios
    const thresholds = [500, 1000, 1500, 2000, 2500, 3000, 5000];
    const scenarios = thresholds.map(threshold => {
      const eligibleAmounts = amounts.filter(amount => amount >= threshold);
      const rolloverAmounts = amounts.filter(amount => amount < threshold);
      
      const eligibleAmount = eligibleAmounts.reduce((sum, amount) => sum + amount, 0);
      const rolloverAmount = rolloverAmounts.reduce((sum, amount) => sum + amount, 0);
      
      let impactDescription = '';
      if (threshold < 2000) {
        const additionalAffiliates = amounts.filter(amount => amount >= threshold && amount < 2000).length;
        impactDescription = `${additionalAffiliates} more affiliates would be eligible`;
      } else if (threshold > 2000) {
        const lostAffiliates = amounts.filter(amount => amount >= 2000 && amount < threshold).length;
        impactDescription = `${lostAffiliates} fewer affiliates would be eligible`;
      } else {
        impactDescription = 'Current threshold';
      }
      
      return {
        threshold,
        eligible_affiliates: eligibleAmounts.length,
        eligible_amount: eligibleAmount,
        rollover_amount: rolloverAmount,
        impact_description: impactDescription
      };
    });
    
    return {
      analysis: {
        current_threshold: 2000,
        scenarios
      }
    };
    
  } catch (error) {
    console.error('Error analyzing threshold impact:', error);
    return {
      analysis: { current_threshold: 2000, scenarios: [] },
      error: 'Failed to analyze threshold impact'
    };
  }
}

/**
 * Identify payment method gaps and missing details
 */
export async function getPaymentMethodGaps(): Promise<{
  gaps: PaymentMethodGaps;
  summary: {
    total_missing_details: number;
    total_pending_amount: number;
    urgent_cases: number; // Affiliates with >3 months of pending amounts
  };
  error?: string;
}> {
  const supabase = getAdminClient();
  
  try {
    // Get affiliates with cleared conversions but missing payment details
    const { data: affiliatesWithConversions, error } = await supabase
      .from('affiliate_conversions')
      .select(`
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
          unified_profiles!fk_unified_profiles_affiliate_id!inner (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('status', 'cleared')
      .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 6 months
    
    if (error) {
      return {
        gaps: { missing_bank_details: [], missing_gcash_details: [], unverified_affiliates: [] },
        summary: { total_missing_details: 0, total_pending_amount: 0, urgent_cases: 0 },
        error: error.message
      };
    }
    
    // Group by affiliate and analyze gaps
    const affiliateData: { [key: string]: any } = {};
    
    affiliatesWithConversions?.forEach(conv => {
      const affiliateId = conv.affiliate_id;
      if (!affiliateData[affiliateId]) {
        const affiliate = conv.affiliates;
        affiliateData[affiliateId] = {
          affiliate_id: affiliateId,
          affiliate_name: `${affiliate.unified_profiles.first_name} ${affiliate.unified_profiles.last_name}`,
          affiliate_email: affiliate.unified_profiles.email,
          has_bank_details: !!(affiliate.account_holder_name && affiliate.account_number && affiliate.bank_name),
          has_gcash_details: !!(affiliate.gcash_number && affiliate.gcash_name),
          is_verified: affiliate.bank_account_verified || affiliate.gcash_verified,
          total_amount: 0,
          oldest_conversion: conv.created_at,
          conversions: []
        };
      }
      
      affiliateData[affiliateId].total_amount += Number(conv.commission_amount);
      affiliateData[affiliateId].conversions.push(conv.created_at);
      
      if (conv.created_at < affiliateData[affiliateId].oldest_conversion) {
        affiliateData[affiliateId].oldest_conversion = conv.created_at;
      }
    });
    
    // Categorize gaps
    const missingBankDetails: any[] = [];
    const missingGcashDetails: any[] = [];
    const unverifiedAffiliates: any[] = [];
    
    Object.values(affiliateData).forEach((affiliate: any) => {
      const monthsPending = Math.floor(
        (Date.now() - new Date(affiliate.oldest_conversion).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      if (!affiliate.has_bank_details) {
        missingBankDetails.push({
          affiliate_id: affiliate.affiliate_id,
          affiliate_name: affiliate.affiliate_name,
          affiliate_email: affiliate.affiliate_email,
          pending_amount: affiliate.total_amount,
          months_pending: monthsPending
        });
      }
      
      if (!affiliate.has_gcash_details) {
        missingGcashDetails.push({
          affiliate_id: affiliate.affiliate_id,
          affiliate_name: affiliate.affiliate_name,
          affiliate_email: affiliate.affiliate_email,
          pending_amount: affiliate.total_amount,
          months_pending: monthsPending
        });
      }
      
      if (!affiliate.is_verified) {
        unverifiedAffiliates.push({
          affiliate_id: affiliate.affiliate_id,
          affiliate_name: affiliate.affiliate_name,
          affiliate_email: affiliate.affiliate_email,
          pending_amount: affiliate.total_amount,
          verification_status: 'pending'
        });
      }
    });
    
    // Calculate summary
    const allGaps = [...missingBankDetails, ...missingGcashDetails, ...unverifiedAffiliates];
    const uniqueAffiliatesWithGaps = new Set(allGaps.map(gap => gap.affiliate_id));
    const totalPendingAmount = Array.from(uniqueAffiliatesWithGaps).reduce((sum, affiliateId) => {
      const affiliate = Object.values(affiliateData).find((a: any) => a.affiliate_id === affiliateId);
      return sum + (affiliate ? affiliate.total_amount : 0);
    }, 0);
    
    const urgentCases = allGaps.filter(gap => gap.months_pending > 3).length;
    
    return {
      gaps: {
        missing_bank_details: missingBankDetails.sort((a, b) => b.pending_amount - a.pending_amount),
        missing_gcash_details: missingGcashDetails.sort((a, b) => b.pending_amount - a.pending_amount),
        unverified_affiliates: unverifiedAffiliates.sort((a, b) => b.pending_amount - a.pending_amount)
      },
      summary: {
        total_missing_details: uniqueAffiliatesWithGaps.size,
        total_pending_amount: totalPendingAmount,
        urgent_cases: urgentCases
      }
    };
    
  } catch (error) {
    console.error('Error analyzing payment method gaps:', error);
    return {
      gaps: { missing_bank_details: [], missing_gcash_details: [], unverified_affiliates: [] },
      summary: { total_missing_details: 0, total_pending_amount: 0, urgent_cases: 0 },
      error: 'Failed to analyze payment method gaps'
    };
  }
} 