'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  AffiliateAnalyticsData,
  AffiliateProgramKPIs,
  AffiliateProgramTrends,
  TopAffiliateDataPoint,
  TrendDataPoint,
} from '@/types/admin/analytics';
import { unstable_cache } from 'next/cache';

/**
 * Fetches analytics data for the affiliate program dashboard.
 * Cached with a 60-second revalidation period
 * @returns Promise<AffiliateAnalyticsData>
 */
export async function getAffiliateProgramAnalytics(startDate?: string, endDate?: string): Promise<AffiliateAnalyticsData> {
  // Create a cache key based on the date range
  return getAffiliateProgramAnalyticsWithCache(startDate, endDate);
}

// Cached implementation that's called by the exported function
const getAffiliateProgramAnalyticsWithCache = unstable_cache(
  async (startDate?: string, endDate?: string): Promise<AffiliateAnalyticsData> => {
    const supabase = getAdminClient();
    
    // Set default date range to last 30 days if not provided
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const endDateObj = endDate ? new Date(endDate) : today;
    endDateObj.setHours(23, 59, 59, 999); // Set to end of day
    const endDateISO = endDateObj.toISOString();
    
    let startDateObj: Date;
    if (startDate) {
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0); // Start of day
    } else {
      startDateObj = new Date();
      startDateObj.setDate(today.getDate() - 30); // Default to 30 days ago
      startDateObj.setHours(0, 0, 0, 0); // Start of day
    }
    const startDateISO = startDateObj.toISOString();

  // Default values for KPIs in case of errors or no data
  const defaultKpis: AffiliateProgramKPIs = {
    totalActiveAffiliates: 0,
    pendingApplications: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalGmv: 0,
    totalCommissionsPaid: 0,
    averageConversionRate: 0,
    dateRangeStart: startDateISO,
    dateRangeEnd: endDateISO,
  };

  const defaultTrends: AffiliateProgramTrends = {
    clicks: [],
    conversions: [],
    gmv: [],
    commissions: [],
  };

  try {
    const [
      activeAffiliatesRes,
      pendingApplicationsRes,
      clicksRes,
      conversionsRes,
    ] = await Promise.all([
      supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('affiliate_clicks')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO),
      supabase.from('affiliate_conversions')
        .select('gmv, commission_amount')
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO),
    ]);

    if (activeAffiliatesRes.error) throw new Error(`Error fetching active affiliates: ${activeAffiliatesRes.error.message}`);
    const totalActiveAffiliates = activeAffiliatesRes.count || 0;

    if (pendingApplicationsRes.error) throw new Error(`Error fetching pending applications: ${pendingApplicationsRes.error.message}`);
    const pendingApplications = pendingApplicationsRes.count || 0;

    if (clicksRes.error) throw new Error(`Error fetching clicks: ${clicksRes.error.message}`);
    const totalClicks = clicksRes.count || 0;
    
    if (conversionsRes.error) throw new Error(`Error fetching conversions: ${conversionsRes.error.message}`);
    const conversionsInPeriod = conversionsRes.data || [];
    const totalConversions = conversionsInPeriod.length;
    const totalGmv = conversionsInPeriod.reduce((sum, c) => sum + (c.gmv || 0), 0);
    // Using commission_earned for totalCommissionsPaid as a proxy for earned commissions in the period.
    // Actual 'paid' commissions would require joining with a payouts table and checking status.
    const totalCommissionsPaid = conversionsInPeriod.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const averageConversionRate = totalClicks > 0 
      ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2)) 
      : 0;

    // Helper to generate daily trend data
    const generateDailyTrend = (records: { created_at: string; value?: number; gmv?: number; commission_amount?: number }[], valueField?: 'value' | 'gmv' | 'commission_amount'): TrendDataPoint[] => {
      const dailyMap = new Map<string, number>();
      
      // Calculate number of days in the selected range
      const diffTime = endDateObj.getTime() - startDateObj.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Generate empty data points for each day in the range
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(startDateObj);
        d.setDate(d.getDate() + i);
        dailyMap.set(d.toISOString().split('T')[0], 0);
      }

      records.forEach(record => {
        const date = record.created_at.split('T')[0];
        let val = 0;
        if (valueField && record[valueField] !== undefined) {
          val = record[valueField] as number;
        } else if (!valueField) { // For counts like clicks/conversions
          val = 1;
        }
        dailyMap.set(date, (dailyMap.get(date) || 0) + val);
      });

      return Array.from(dailyMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    // Fetch raw click and conversion data for trends
    const { data: clicksData, error: clicksTrendError } = await supabase
      .from('affiliate_clicks')
      .select('created_at')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO);
    if (clicksTrendError) throw new Error(`Error fetching clicks for trends: ${clicksTrendError.message}`);

    const { data: conversionsData, error: conversionsTrendError } = await supabase
      .from('affiliate_conversions')
      .select('created_at, gmv, commission_amount')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO);
    if (conversionsTrendError) throw new Error(`Error fetching conversions for trends: ${conversionsTrendError.message}`);

    const trends: AffiliateProgramTrends = {
      clicks: generateDailyTrend(clicksData || []),
      conversions: generateDailyTrend(conversionsData || []),
      gmv: generateDailyTrend(conversionsData || [], 'gmv'),
      commissions: generateDailyTrend(conversionsData || [], 'commission_amount'),
    };

    // Fetch Top Performing Affiliates by Conversions
    let topAffiliatesByConversions: TopAffiliateDataPoint[] = [];
    try {
      const { data: conversionCountsData, error: conversionCountsError } = await supabase
        .from('affiliate_conversions')
        .select('affiliate_id') // Select affiliate_id to count conversions
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO);

      if (conversionCountsError) {
        console.error(`Error fetching conversion counts for top affiliates: ${conversionCountsError.message}`);
        // Potentially throw, or allow to proceed with empty topAffiliates
      } else {
        const affiliateConversionCounts: { [key: string]: number } = (conversionCountsData || []).reduce((acc, conv) => {
          if (conv.affiliate_id) {
            acc[conv.affiliate_id] = (acc[conv.affiliate_id] || 0) + 1;
          }
          return acc;
        }, {} as { [key: string]: number });

        const sortedAffiliateIds = Object.entries(affiliateConversionCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 5) // Get top 5
          .map(([affiliateId]) => affiliateId);

        if (sortedAffiliateIds.length > 0) {
          const { data: topAffiliatesDetails, error: topAffiliatesDetailsError } = await supabase
            .from('affiliates')
            .select(`
              id,
              slug,
              unified_profiles!user_id (
                first_name,
                last_name
              )
            `)
            .in('id', sortedAffiliateIds);

          if (topAffiliatesDetailsError) {
            console.error(`Error fetching details for top affiliates: ${topAffiliatesDetailsError.message}`);
          } else {
            topAffiliatesByConversions = (topAffiliatesDetails || []).map(affiliate => ({
              affiliateId: affiliate.id,
              name: (affiliate.unified_profiles?.first_name && affiliate.unified_profiles?.last_name ? `${affiliate.unified_profiles.first_name} ${affiliate.unified_profiles.last_name}` : affiliate.slug),
              slug: affiliate.slug,
              value: affiliateConversionCounts[affiliate.id] || 0,
            })).sort((a, b) => b.value - a.value); // Ensure final sort by value
          }
        }
      }
    } catch (topAffiliatesFetchError) {
      console.error("Error processing top performing affiliates:", topAffiliatesFetchError);
      // topAffiliatesByConversions will remain []
    }
    return {
      kpis: {
        totalActiveAffiliates,
        pendingApplications,
        totalClicks,
        totalConversions,
        totalGmv,
        totalCommissionsPaid,
        averageConversionRate,
        dateRangeStart: startDateISO,
        dateRangeEnd: endDateISO,
      },
      trends,
      topAffiliatesByConversions,
      // Adding direct access fields required by the interface
      totalActiveAffiliates,
      pendingApplications,
      totalClicksLast30Days: totalClicks,  // Using the same values since we're already fetching for the specified timeframe
      totalConversionsLast30Days: totalConversions,
      totalGmvLast30Days: totalGmv,
      totalCommissionsPaidLast30Days: totalCommissionsPaid,
      averageConversionRate,
    };

  } catch (error) {
    console.error('Error fetching real affiliate program analytics:', error instanceof Error ? error.message : String(error));
    // Fallback to default/empty KPIs and Trends on any error during data fetching
    return {
      kpis: defaultKpis,
      trends: defaultTrends,
      topAffiliatesByConversions: [],
      // Adding direct access fields required by the interface
      totalActiveAffiliates: defaultKpis.totalActiveAffiliates,
      pendingApplications: defaultKpis.pendingApplications,
      totalClicksLast30Days: defaultKpis.totalClicks,
      totalConversionsLast30Days: defaultKpis.totalConversions,
      totalGmvLast30Days: defaultKpis.totalGmv,
      totalCommissionsPaidLast30Days: defaultKpis.totalCommissionsPaid,
      averageConversionRate: defaultKpis.averageConversionRate,
    };
  }
},
['affiliate-program-analytics', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-analytics'] }
); 