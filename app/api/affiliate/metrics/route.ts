import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createRouteHandlerClient, handleServerError, handleUnauthorized } from '@/lib/supabase/route-handler';
import { metricsFilterSchema, metricsResponseSchema } from '@/lib/validation/affiliate/metrics-schema';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { verifyActiveAffiliate } from '@/lib/supabase/auth-utils';

// Note: The verifyActiveAffiliate function has been moved to @/lib/supabase/auth-utils.ts
// It now uses supabase.auth.getUser() instead of getSession() for improved security

/**
 * Generates empty data points in the correct format for the metrics response
 * @param startDate The start date for the data points
 * @param endDate The end date for the data points
 * @param groupBy How to group the data points (day, week, month)
 * @returns Array of empty data points formatted for the response schema
 */
function generateEmptyDataPoints(startDate: Date, endDate: Date, groupBy: string = 'day') {
  const dataPoints = [];
  const currentDate = new Date(startDate);
  
  // Generate dates between start and end dates based on groupBy
  while (currentDate <= endDate) {
    dataPoints.push({
      date: currentDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      clicks: 0,
      conversions: 0,
      revenue: 0,
      commission: 0
    });
    
    // Increment date based on groupBy
    if (groupBy === 'day') {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (groupBy === 'week') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (groupBy === 'month') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
  
  return dataPoints;
}

/**
 * Calculates metrics for the affiliate based on provided filters
 * @param supabase Supabase client
 * @param affiliateId The affiliate's ID
 * @param filters Optional filters for the metrics query
 * @returns Calculated metrics data
 */
async function calculateAffiliateMetrics(supabase: any, affiliateId: string, filters: any = {}) {
  const {
    date_range,
    referral_link_id,
    group_by = 'day',
  } = filters;

  // Set up date filters - if no date_range provided, fetch all data (All Time)
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let startDateStr: string | null = null;
  let endDateStr: string | null = null;
  
  if (date_range) {
    const now = new Date();
    startDate = date_range.start_date 
      ? new Date(date_range.start_date) 
      : new Date(now.setMonth(now.getMonth() - 1)); // Default to 1 month ago
    
    endDate = date_range.end_date 
      ? new Date(date_range.end_date) 
      : new Date(); // Default to today
    
    // Format dates for Postgres
    startDateStr = startDate.toISOString();
    endDateStr = endDate.toISOString();
  }

  // Import the admin client which bypasses RLS
  const adminClient = await getAdminClient();
  
  // Use the admin client to fetch data directly, bypassing RLS policies
  let clicksQuery = adminClient
    .from('affiliate_clicks')
    .select('id, created_at, visitor_id, ip_address, user_agent, referral_url, landing_page_url')
    .eq('affiliate_id', affiliateId);
  
  // Add date filters only if date range is specified
  if (startDateStr && endDateStr) {
    clicksQuery = clicksQuery
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr);
  }
  
  const { data: clicksData, error: clicksError } = await clicksQuery
    .order('created_at', { ascending: false });
  
  // Debug output for query results
  console.log('Query completed, error:', clicksError ? clicksError.message : 'none');
  console.log('Results count:', clicksData ? clicksData.length : 0);
  
  if (clicksError) {
    console.error('Error fetching affiliate clicks:', clicksError);
    // Continue with empty clicks data instead of failing the entire request
    // Return in the format expected by metricsResponseSchema (snake_case)
    return {
      summary: {
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
        total_commission: 0,
        conversion_rate: 0,
        earnings_per_click: 0
      },
      data_points: [] // Empty array of data points that matches schema
    };
  }

  // Fetch conversions data within date range - also using admin client to bypass RLS
  let conversionsQuery = adminClient
    .from('affiliate_conversions')
    .select('id, created_at, order_id, status, gmv, commission_amount, level')
    .eq('affiliate_id', affiliateId);
  
  // Add date filters only if date range is specified
  if (startDateStr && endDateStr) {
    conversionsQuery = conversionsQuery
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr);
  }
  
  // Filter by status (only count cleared or paid conversions)
  conversionsQuery = conversionsQuery.in('status', ['cleared', 'paid']);
  
  // Add link filter if specified
  if (referral_link_id) {
    // Similar adjustment needed based on your data model
  }

  // Execute conversions query with better error handling
  const { data: conversionsData, error: conversionsError } = await conversionsQuery;
  
  if (conversionsError) {
    console.error('Error fetching affiliate conversions:', conversionsError);
    // Continue with empty conversions data instead of failing
    // We need to generate data points in the correct format for the schema
    const clickCount = clicksData?.length || 0;
    
    // Create empty data points that match the required schema format
    const emptyDataPoints = startDate && endDate 
      ? generateEmptyDataPoints(startDate, endDate, group_by)
      : []; // For "All Time" with no data, return empty array
    
    return {
      summary: {
        total_clicks: clickCount,
        total_conversions: 0,
        total_revenue: 0,
        total_commission: 0,
        conversion_rate: 0,
        earnings_per_click: 0
      },
      data_points: emptyDataPoints
    };
  }

  // Add comprehensive logging for debugging
  console.log('🔍 METRICS API DEBUG - Raw Data:');
  console.log('- Affiliate ID:', affiliateId);
  console.log('- Date Range:', { startDateStr, endDateStr });
  console.log('- Raw Clicks Count:', clicksData?.length || 0);
  console.log('- Raw Conversions Count:', conversionsData?.length || 0);
  console.log('- Raw Conversions Data:', conversionsData?.map(c => ({
    id: c.id,
    status: c.status,
    commission: c.commission_amount,
    gmv: c.gmv,
    created_at: c.created_at
  })) || []);

  // Calculate summary metrics
  const totalClicks = clicksData.length;
  const totalConversions = conversionsData.filter((conv: any) => ['cleared', 'paid'].includes(conv.status)).length;
  const totalRevenue = conversionsData.reduce((sum: number, conv: any) => sum + parseFloat(conv.gmv), 0);
  const totalCommission = conversionsData
    .filter((conv: any) => ['cleared', 'paid'].includes(conv.status))
    .reduce((sum: number, conv: any) => sum + parseFloat(conv.commission_amount), 0);

  console.log('🧮 METRICS API DEBUG - Calculated Values:');
  console.log('- Total Clicks:', totalClicks);
  console.log('- Total Conversions (cleared/paid only):', totalConversions);
  console.log('- Total Revenue:', totalRevenue);
  console.log('- Total Commission:', totalCommission);
  console.log('- Filtered Conversions:', conversionsData.filter((conv: any) => ['cleared', 'paid'].includes(conv.status)).map(c => ({
    id: c.id,
    status: c.status,
    commission: c.commission_amount
  })));
  
  // Calculate derived metrics
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const earningsPerClick = totalClicks > 0 ? totalCommission / totalClicks : 0;
  
  // Format data points for the response
  const dataPoints = (startDate && endDate 
    ? generateEmptyDataPoints(startDate, endDate, group_by)
    : [] // For "All Time", return empty data points array
  ).map(emptyPoint => {
    const date = emptyPoint.date;
    const dayClicks = clicksData.filter((click: any) => {
      const clickDate = new Date(click.created_at).toISOString().split('T')[0];
      return clickDate === date;
    }).length;
    
    const dayConversions = conversionsData.filter((conv: any) => {
      const convDate = new Date(conv.created_at).toISOString().split('T')[0];
      return convDate === date && ['cleared', 'paid'].includes(conv.status);
    });
    
    const dayConversionCount = dayConversions.length;
    const dayRevenue = dayConversions.reduce((sum: number, conv: any) => sum + parseFloat(conv.gmv), 0);
    const dayCommission = dayConversions.reduce((sum: number, conv: any) => sum + parseFloat(conv.commission_amount), 0);
    
    return {
      date,
      clicks: dayClicks,
      conversions: dayConversionCount,
      revenue: dayRevenue,
      commission: dayCommission
    };
  });
  
  // Return in the format expected by the schema
  return {
    summary: {
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      total_revenue: totalRevenue,
      total_commission: totalCommission,
      conversion_rate: conversionRate,
      earnings_per_click: earningsPerClick
    },
    data_points: dataPoints,
    filter: filters // Include the original filter parameters
  };
}

/**
 * Helper function to generate time series data for metrics
 */
function generateTimeSeriesData(startDate: Date, endDate: Date, groupBy: string, clicksData: any[], conversionsData: any[]) {
  const dataPoints: any[] = [];
  const dateFormat = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: groupBy === 'day' || groupBy === 'week' ? '2-digit' : 'short',
    day: groupBy === 'day' ? '2-digit' : undefined,
  });

  // Create a map to hold data by date
  const dataByDate = new Map();

  // Helper to get the appropriate date key based on grouping
  const getDateKey = (date: Date) => {
    if (groupBy === 'day') {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'week') {
      // Get first day of the week
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      const firstDayOfWeek = new Date(date);
      firstDayOfWeek.setDate(diff);
      return firstDayOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD of first day of week
    } else { // month
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    }
  };

  // Initialize date range
  let current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = getDateKey(current);
    
    if (!dataByDate.has(dateKey)) {
      dataByDate.set(dateKey, {
        date: dateFormat.format(current),
        clicks: 0,
        conversions: 0,
        revenue: 0,
        commission: 0,
      });
    }

    // Advance to next period based on grouping
    if (groupBy === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (groupBy === 'week') {
      current.setDate(current.getDate() + 7);
    } else { // month
      current.setMonth(current.getMonth() + 1);
    }
  }

  // Count clicks by date
  clicksData.forEach(click => {
    const clickDate = new Date(click.created_at);
    const dateKey = getDateKey(clickDate);
    
    if (dataByDate.has(dateKey)) {
      const data = dataByDate.get(dateKey);
      data.clicks += 1;
    }
  });

  // Add conversions, revenue, and commission by date
  conversionsData.forEach(conversion => {
    const convDate = new Date(conversion.created_at);
    const dateKey = getDateKey(convDate);
    
    if (dataByDate.has(dateKey)) {
      const data = dataByDate.get(dateKey);
      data.conversions += 1;
      data.revenue += (conversion.gmv || 0);
      data.commission += (conversion.commission_amount || 0);
    }
  });

  // Convert map to array and sort by date
  return Array.from(dataByDate.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * POST /api/affiliate/metrics
 * Retrieves metrics for the authenticated affiliate based on filters
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, affiliateId } = await verifyActiveAffiliate();
    
    // Parse and validate request body
    const requestBody = await request.json();
    const validatedFilters = metricsFilterSchema.parse(requestBody);
    
    // Calculate metrics based on filters
    const metricsData = await calculateAffiliateMetrics(supabase, affiliateId, validatedFilters);
    
    // Validate the response against our schema
    const validatedResponse = metricsResponseSchema.parse(metricsData);
    
    // Set cache headers (5 minutes)
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    
    return NextResponse.json(validatedResponse, { 
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error in POST /api/affiliate/metrics:', error);
    
    if (error instanceof Error) {
      if (error.message.startsWith('Unauthorized:')) {
        return handleUnauthorized();
      }
      
      // Check for Zod validation errors
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.message },
          { status: 400 }
        );
      }
    }
    
    return handleServerError('Failed to retrieve affiliate metrics');
  }
}
