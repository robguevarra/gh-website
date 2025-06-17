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
import { createServerSupabaseClient } from '@/lib/supabase/client';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

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

/**
 * Export affiliate analytics data in various formats
 */
export async function exportAnalyticsReport({
  reportType,
  format = 'csv',
  startDate,
  endDate,
}: {
  reportType: 'performance' | 'financial' | 'conversions';
  format?: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
}): Promise<{
  data: string | null;
  filename: string;
  contentType: string;
  error: string | null;
}> {
  try {
    // Get analytics data
    const analyticsData = await getAffiliateProgramAnalytics(startDate, endDate);
    
    const timestamp = new Date().toISOString().split('T')[0];
    let filename: string;
    let contentType: string;
    let exportData: string;

    if (format === 'csv') {
      contentType = 'text/csv';
      
      switch (reportType) {
        case 'performance':
          filename = `affiliate-performance-report-${timestamp}.csv`;
          exportData = generatePerformanceCSV(analyticsData);
          break;
        case 'financial':
          filename = `affiliate-financial-report-${timestamp}.csv`;
          exportData = generateFinancialCSV(analyticsData);
          break;
        case 'conversions':
          filename = `affiliate-conversions-report-${timestamp}.csv`;
          exportData = generateConversionsCSV(analyticsData);
          break;
        default:
          throw new Error('Invalid report type');
      }
    } else {
      // JSON format
      contentType = 'application/json';
      
      const exportObject = {
        export_metadata: {
          generated_at: new Date().toISOString(),
          report_type: reportType,
          date_range: {
            start: startDate || analyticsData.kpis.dateRangeStart,
            end: endDate || analyticsData.kpis.dateRangeEnd,
          },
          format: 'json'
        },
        data: analyticsData
      };

      filename = `affiliate-${reportType}-report-${timestamp}.json`;
      exportData = JSON.stringify(exportObject, null, 2);
    }

    // Log admin activity
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Exported ${reportType} analytics report`,
      details: { 
        format,
        report_type: reportType,
        filename,
        date_range: { startDate, endDate }
      }
    });

    return {
      data: exportData,
      filename,
      contentType,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to export analytics report.';
    console.error('exportAnalyticsReport error:', errorMessage);
    return {
      data: null,
      filename: '',
      contentType: '',
      error: errorMessage,
    };
  }
}

/**
 * Generate CSV for affiliate performance report
 */
function generatePerformanceCSV(data: AffiliateAnalyticsData): string {
  const headers = [
    'Metric',
    'Value',
    'Description'
  ];

  const rows = [
    headers.join(','),
    `"Total Active Affiliates","${data.kpis.totalActiveAffiliates}","Number of currently active affiliate partners"`,
    `"Pending Applications","${data.kpis.pendingApplications}","Affiliate applications awaiting review"`,
    `"Total Clicks","${data.kpis.totalClicks}","Total affiliate link clicks in period"`,
    `"Total Conversions","${data.kpis.totalConversions}","Total successful conversions in period"`,
    `"Conversion Rate","${data.kpis.averageConversionRate}%","Average conversion rate across all affiliates"`,
    `"Total Revenue (GMV)","₱${data.kpis.totalGmv.toLocaleString()}","Gross merchandise value from affiliate sales"`,
    `"Total Commissions","₱${data.kpis.totalCommissionsPaid.toLocaleString()}","Total commissions paid to affiliates"`,
    '',
    '"Top Performing Affiliates"',
    '"Rank","Affiliate Name","Conversions","Slug"'
  ];

  // Add top affiliates data
  data.topAffiliatesByConversions.forEach((affiliate, index) => {
    rows.push(`"${index + 1}","${affiliate.name}","${affiliate.value}","${affiliate.slug || 'N/A'}"`);
  });

  return rows.join('\n');
}

/**
 * Generate CSV for financial report
 */
function generateFinancialCSV(data: AffiliateAnalyticsData): string {
  const headers = [
    'Financial Metric',
    'Amount (PHP)',
    'Percentage',
    'Description'
  ];

  const netRevenue = data.kpis.totalGmv - data.kpis.totalCommissionsPaid;
  const commissionRate = data.kpis.totalGmv > 0 ? (data.kpis.totalCommissionsPaid / data.kpis.totalGmv) * 100 : 0;

  const rows = [
    headers.join(','),
    `"Total Revenue (GMV)","${data.kpis.totalGmv.toLocaleString()}","100%","Gross merchandise value from all affiliate sales"`,
    `"Total Commissions Paid","${data.kpis.totalCommissionsPaid.toLocaleString()}","${commissionRate.toFixed(1)}%","Total commissions paid to affiliates"`,
    `"Net Revenue","${netRevenue.toLocaleString()}","${(100 - commissionRate).toFixed(1)}%","Revenue after commission payments"`,
    `"Average Commission per Conversion","${data.kpis.totalConversions > 0 ? (data.kpis.totalCommissionsPaid / data.kpis.totalConversions).toLocaleString() : '0'}","","Average commission amount per successful conversion"`,
    `"Revenue per Click","${data.kpis.totalClicks > 0 ? (data.kpis.totalGmv / data.kpis.totalClicks).toFixed(2) : '0'}","","Average revenue generated per affiliate click"`,
    '',
    '"Financial Health Indicators"',
    `"Commission Efficiency","${commissionRate.toFixed(1)}%","","Percentage of revenue paid as commissions"`,
    `"Conversion Value","${data.kpis.totalConversions > 0 ? (data.kpis.totalGmv / data.kpis.totalConversions).toLocaleString() : '0'}","","Average order value per conversion"`,
    `"Active Affiliate ROI","${data.kpis.totalActiveAffiliates > 0 ? (data.kpis.totalGmv / data.kpis.totalActiveAffiliates).toLocaleString() : '0'}","","Average revenue per active affiliate"`
  ];

  return rows.join('\n');
}

/**
 * Generate CSV for conversions report
 */
function generateConversionsCSV(data: AffiliateAnalyticsData): string {
  const headers = [
    'Conversion Metric',
    'Value',
    'Rate/Percentage',
    'Analysis'
  ];

  const clickToConversionRate = data.kpis.totalClicks > 0 ? (data.kpis.totalConversions / data.kpis.totalClicks) * 100 : 0;
  const avgConversionsPerAffiliate = data.kpis.totalActiveAffiliates > 0 ? data.kpis.totalConversions / data.kpis.totalActiveAffiliates : 0;

  const rows = [
    headers.join(','),
    `"Total Conversions","${data.kpis.totalConversions}","","Total successful conversions in reporting period"`,
    `"Total Clicks","${data.kpis.totalClicks}","","Total affiliate link clicks in reporting period"`,
    `"Overall Conversion Rate","${clickToConversionRate.toFixed(2)}%","${clickToConversionRate.toFixed(2)}%","Percentage of clicks that resulted in conversions"`,
    `"Average Conversions per Affiliate","${avgConversionsPerAffiliate.toFixed(1)}","","Average number of conversions per active affiliate"`,
    `"Conversion Efficiency Score","${data.kpis.averageConversionRate.toFixed(1)}","${data.kpis.averageConversionRate.toFixed(1)}%","Weighted average conversion rate across all affiliates"`,
    '',
    '"Conversion Performance Analysis"',
    `"High Performers","${data.topAffiliatesByConversions.filter(a => a.value >= 5).length}","","Affiliates with 5+ conversions"`,
    `"Active Contributors","${data.topAffiliatesByConversions.filter(a => a.value >= 1).length}","","Affiliates with at least 1 conversion"`,
    `"Top Performer Contribution","${data.topAffiliatesByConversions.length > 0 ? data.topAffiliatesByConversions[0]?.value || 0 : 0}","${data.kpis.totalConversions > 0 && data.topAffiliatesByConversions.length > 0 ? ((data.topAffiliatesByConversions[0]?.value || 0) / data.kpis.totalConversions * 100).toFixed(1) : 0}%","Conversions from top performing affiliate"`,
    '',
    '"Detailed Affiliate Conversion Data"',
    '"Rank","Affiliate Name","Conversions","Conversion Share","Performance Level"'
  ];

  // Add detailed affiliate conversion data
  data.topAffiliatesByConversions.forEach((affiliate, index) => {
    const conversionShare = data.kpis.totalConversions > 0 ? (affiliate.value / data.kpis.totalConversions * 100).toFixed(1) : '0';
    let performanceLevel = 'Low';
    if (affiliate.value >= 10) performanceLevel = 'Excellent';
    else if (affiliate.value >= 5) performanceLevel = 'High';
    else if (affiliate.value >= 2) performanceLevel = 'Medium';

    rows.push(`"${index + 1}","${affiliate.name}","${affiliate.value}","${conversionShare}%","${performanceLevel}"`);
  });

  return rows.join('\n');
} 