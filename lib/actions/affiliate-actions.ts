'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { AdminAffiliateListItem, AffiliateStatusType, AdminFraudFlagListItem, FraudFlagItem, AffiliateProgramConfigData } from '../types/admin/affiliate';
import { revalidatePath } from 'next/cache';

// Define and export types for Affiliate Analytics
export interface TrendDataPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface AffiliateProgramTrends {
  clicks: TrendDataPoint[];
  conversions: TrendDataPoint[];
  gmv: TrendDataPoint[];
  commissions: TrendDataPoint[];
}

export interface AffiliateProgramKPIs {
  totalActiveAffiliates: number;
  pendingApplications: number;
  totalClicks: number;
  totalConversions: number;
  totalGmv: number;
  totalCommissionsPaid: number;
  averageConversionRate: number; // Percentage
  dateRangeStart?: string; // ISO date string for the start of the date range
  dateRangeEnd?: string; // ISO date string for the end of the date range
}

export interface AffiliateAnalyticsData {
  kpis: AffiliateProgramKPIs;
  trends: AffiliateProgramTrends;
  topAffiliatesByConversions?: TopAffiliateDataPoint[];
  // Placeholder for future additions like recentActivity
}

export interface TopAffiliateDataPoint {
  affiliateId: string;
  name: string; // Could be Name or Slug
  value: number; // Number of conversions
  slug: string;
}


export async function getAdminAffiliates(): Promise<AdminAffiliateListItem[]> {
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('affiliates')
      .select(`
        id,
        user_id,
        slug,
        status,
        created_at,
        unified_profiles!affiliates_user_id_fkey (
          email,
          first_name,
          last_name,
          membership_level_id,
          membership_levels (name, commission_rate)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching affiliates:', error);
      throw new Error(`Failed to fetch affiliates: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    const affiliates: AdminAffiliateListItem[] = data.map((item: any) => {
      const profile = item.unified_profiles; // Assuming !affiliates_user_id_fkey ensures this is an object or null
      
      let name = 'N/A';
      if (profile) {
        if (profile.first_name && profile.last_name) {
          name = `${profile.first_name} ${profile.last_name}`;
        } else if (profile.first_name) {
          name = profile.first_name;
        } else if (profile.last_name) {
          name = profile.last_name;
        } else if (profile.email) {
          name = profile.email;
        }
      }

      const membershipLevelData = profile?.membership_levels as { name: string; commission_rate: number } | undefined;
      return {
        affiliate_id: item.id,
        user_id: item.user_id,
        name: name,
        email: profile?.email || 'N/A',
        slug: item.slug,
        status: item.status as AffiliateStatusType,
        membership_level_name: membershipLevelData?.name,
        tier_commission_rate: membershipLevelData?.commission_rate,
        current_membership_level_id: profile?.membership_level_id || null,
        joined_date: item.created_at,
        total_clicks: 0, // Placeholder for list view
        total_conversions: 0, // Placeholder for list view
        total_earnings: 0,    // Placeholder for list view
      };
    });

    return affiliates;
  } catch (err) {
    console.error('Unexpected error in getAdminAffiliates:', err);
    if (err instanceof Error) {
        throw new Error(`An unexpected error occurred: ${err.message}`);
    }
    throw new Error('An unexpected error occurred while fetching affiliates.');
  }
}

export async function approveAffiliate(affiliateId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from('affiliates')
      .update({ status: 'active' })
      .eq('id', affiliateId)
      .select('id') 
      .single(); 

    if (error) {
      console.error('Error approving affiliate:', error);
      return { success: false, error: `Failed to approve affiliate: ${error.message}` };
    }
    revalidatePath('/admin/affiliates');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in approveAffiliate:', err);
    if (err instanceof Error) {
        return { success: false, error: `An unexpected error occurred: ${err.message}` };
    }
    return { success: false, error: 'An unexpected error occurred while approving the affiliate.' };
  }
}

export async function rejectAffiliate(affiliateId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from('affiliates')
      .update({ status: 'inactive' }) // Assuming 'inactive' is the status for rejected
      .eq('id', affiliateId)
      .select('id')
      .single();

    if (error) {
      console.error('Error rejecting affiliate:', error);
      return { success: false, error: `Failed to reject affiliate: ${error.message}` };
    }
    revalidatePath('/admin/affiliates');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in rejectAffiliate:', err);
    if (err instanceof Error) { return { success: false, error: err.message }; }
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function flagAffiliate(affiliateId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from('affiliates')
      .update({ status: 'flagged' })
      .eq('id', affiliateId)
      .select('id')
      .single();

    if (error) {
      console.error('Error flagging affiliate:', error);
      return { success: false, error: `Failed to flag affiliate: ${error.message}` };
    } // Closing 'if (error)'
    revalidatePath('/admin/affiliates');
    revalidatePath(`/admin/affiliates/${affiliateId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in flagAffiliate:', err);
    if (err instanceof Error) { return { success: false, error: err.message }; }
    return { success: false, error: 'An unexpected error occurred.' };
  }
} // Closing flagAffiliate function

export async function getAdminAffiliateById(affiliateId: string): Promise<AdminAffiliateListItem | null> {
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('affiliates')
      .select(`
        id,
        user_id,
        slug,
        status,
        created_at,
        unified_profiles!affiliates_user_id_fkey (
          email,
          first_name,
          last_name,
          membership_level_id,
          membership_levels (name, commission_rate)
        ),
        fraud_flags (*)
      `)
      .eq('id', affiliateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST error code for 'No rows found'
        console.warn(`Affiliate with ID ${affiliateId} not found.`);
        return null;
      }
      console.error(`Error fetching affiliate ${affiliateId}:`, error);
      throw new Error(`Failed to fetch affiliate ${affiliateId}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const profile = data.unified_profiles;
    let name = 'N/A';
    if (profile) {
      if (profile.first_name && profile.last_name) {
        name = `${profile.first_name} ${profile.last_name}`;
      } else if (profile.first_name) {
        name = profile.first_name;
      } else if (profile.last_name) {
        name = profile.last_name;
      } else if (profile.email) {
        name = profile.email;
      }
    }

    const membershipLevelData = profile?.membership_levels as { name: string; commission_rate: number } | undefined;

    // Fetch aggregate data for clicks, conversions, and earnings
    // This is a simplified example; you might need more complex queries or separate calls

    const clicksResponse = await supabase
      .from('affiliate_clicks')
      .select('id', { count: 'exact', head: true }) // Use head:true for efficiency if only count is needed
      .eq('affiliate_id', affiliateId);

    const conversionsResponse = await supabase
      .from('affiliate_conversions')
      .select('commission_amount', { count: 'exact' }) // Select only commission_amount for sum, and get count
      .eq('affiliate_id', affiliateId);

    if (clicksResponse.error || conversionsResponse.error) {
      console.error('Error fetching aggregate data:', clicksResponse.error || conversionsResponse.error);
      // For now, we'll proceed and this will result in 0s. Consider if throwing an error is better.
    }

    const totalClicks = clicksResponse.count || 0;
    const totalConversions = conversionsResponse.count || 0;
    // conversionsResponse.data will be an array of { commission_amount: number } or null
    const totalEarnings = conversionsResponse.data?.reduce((sum: number, conv: { commission_amount?: number | null }) => sum + (conv.commission_amount || 0), 0) || 0;

    const fraudFlagsTyped = (data.fraud_flags || []).map((flag: any): FraudFlagItem => ({
      id: flag.id,
      affiliate_id: flag.affiliate_id,
      reason: flag.reason,
      details: flag.details, // Assuming details is already in the correct format or 'any'
      resolved: flag.resolved,
      resolved_at: flag.resolved_at,
      resolver_notes: flag.resolver_notes,
      created_at: new Date(flag.created_at).toISOString(),
      updated_at: new Date(flag.updated_at).toISOString(),
    }));

    return {
      affiliate_id: data.id,
      user_id: data.user_id,
      name: name,
      email: profile?.email || 'N/A',
      slug: data.slug,
      status: data.status as AffiliateStatusType,
      membership_level_name: membershipLevelData?.name,
      tier_commission_rate: membershipLevelData?.commission_rate,
      current_membership_level_id: profile?.membership_level_id || null,
      joined_date: new Date(data.created_at).toLocaleDateString(),
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      total_earnings: totalEarnings,
      ctr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      fraud_flags: fraudFlagsTyped,
    };

  } catch (err) {
    console.error(`Unexpected error fetching affiliate ${affiliateId}:`, err);
    if (err instanceof Error) {
        throw new Error(`An unexpected error occurred while fetching affiliate details: ${err.message}`);
    }
    throw new Error('An unexpected error occurred while fetching affiliate details.');
  }
}

export async function getAllAdminFraudFlags(): Promise<AdminFraudFlagListItem[]> {
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('fraud_flags')
      .select(`
        *,
        affiliates (
          user_id,
          unified_profiles!user_id (
            email,
            first_name,
            last_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fraud flags:', error);
      throw new Error(`Failed to fetch fraud flags: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    const fraudFlags: AdminFraudFlagListItem[] = data.map((item: any) => {
      const affiliateData = item.affiliates;
      const profile = affiliateData?.unified_profiles;
      
      let affiliateName = 'N/A';
      if (profile) {
        if (profile.first_name && profile.last_name) {
          affiliateName = `${profile.first_name} ${profile.last_name}`;
        } else if (profile.first_name) {
          affiliateName = profile.first_name;
        } else if (profile.last_name) {
          affiliateName = profile.last_name;
        } else if (profile.email) {
          affiliateName = profile.email; // Fallback to email
        }
      } else if (affiliateData?.user_id) {
        affiliateName = `User ID: ${affiliateData.user_id}`; // Fallback if profile missing
      }

      const baseFlag: FraudFlagItem = {
        id: item.id,
        affiliate_id: item.affiliate_id,
        reason: item.reason,
        details: item.details,
        resolved: item.resolved,
        resolved_at: item.resolved_at,
        resolver_notes: item.resolver_notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };

      return {
        ...baseFlag,
        affiliate_name: affiliateName,
        affiliate_email: profile?.email || 'N/A',
      };
    });

    return fraudFlags;

  } catch (err) {
    console.error('Unexpected error in getAllAdminFraudFlags:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    throw new Error(`Unexpected error fetching all fraud flags: ${errorMessage}`);
  }
}

export async function resolveFraudFlag(
  flagId: string,
  resolverNotes: string
): Promise<{ success: boolean; error?: string; data?: FraudFlagItem }> {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('fraud_flags')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolver_notes: resolverNotes,
      })
      .eq('id', flagId)
      .select()
      .single();

    if (error) {
      console.error(`Error resolving fraud flag ${flagId}:`, error);
      return { success: false, error: `Failed to resolve fraud flag: ${error.message}` };
    }

    revalidatePath('/admin/affiliates/flags');
    // Consider revalidating /admin/affiliates and /admin/affiliates/[id] if resolving a flag
    // should also trigger an update to the affiliate's status display on those pages.
    // For now, status changes are handled by a separate admin action.

    return { success: true, data: data as FraudFlagItem };
  } catch (err) {
    console.error(`Unexpected error resolving fraud flag ${flagId}:`, err);
    if (err instanceof Error) {
      return { success: false, error: `An unexpected error occurred: ${err.message}` };
    }
    return { success: false, error: 'An unexpected error occurred while resolving the fraud flag.' };
  }
}

// Interface for the analytics data structure
export interface AffiliateAnalyticsData {
  kpis: {
    totalActiveAffiliates: number;
    pendingApplications: number;
    totalClicksLast30Days: number;
    totalConversionsLast30Days: number;
    totalGmvLast30Days: number;
    totalCommissionsPaidLast30Days: number;
    averageConversionRate: number;
  };
  // TODO: Add structures for chart data (e.g., time series data for clicksOverTime, conversionsOverTime)
}

/**
 * Fetches analytics data for the affiliate program dashboard.
 * @returns Promise<AffiliateAnalyticsData>
 */
export async function getAffiliateProgramAnalytics(startDate?: string, endDate?: string): Promise<AffiliateAnalyticsData> {
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
    };

  } catch (error) {
    console.error('Error fetching real affiliate program analytics:', error instanceof Error ? error.message : String(error));
    // Fallback to default/empty KPIs and Trends on any error during data fetching
    return {
      kpis: defaultKpis,
      trends: defaultTrends,
      topAffiliatesByConversions: [],
    };
  }
}


export async function updateAffiliateStatus(
  affiliateId: string,
  status: AffiliateStatusType
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  try {
    const { error } = await supabase
      .from('affiliates')
      .update({ status: status })
      .eq('id', affiliateId);

    if (error) {
      console.error(`Error updating status for affiliate ${affiliateId}:`, error);
      return { success: false, error: `Failed to update status: ${error.message}` };
    }

    revalidatePath('/admin/affiliates');
    revalidatePath(`/admin/affiliates/${affiliateId}`);
    return { success: true };
  } catch (err) {
    console.error(`Unexpected error updating status for affiliate ${affiliateId}:`, err);
    if (err instanceof Error) {
      return { success: false, error: `An unexpected error occurred: ${err.message}` };
    }
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function updateAdminAffiliateDetails(
  affiliateId: string,
  updates: { slug?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  // Currently, only slug updates are directly handled here.
  // Status and membership level are handled by separate, more specific functions.
  if (Object.keys(updates).length === 0) {
    return { success: true }; // No updates to perform
  }

  if (updates.slug && (updates.slug.length < 3 || !/^[a-z0-9-]+$/.test(updates.slug))) {
    return { success: false, error: 'Slug must be at least 3 characters long and contain only lowercase letters, numbers, and hyphens.' };
  }

  try {
    const { error } = await supabase
      .from('affiliates')
      .update({ slug: updates.slug })
      .eq('id', affiliateId);

    if (error) {
      console.error(`Error updating affiliate ${affiliateId} slug:`, error);
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'This slug is already in use. Please choose a different one.' };
      }
      return { success: false, error: `Failed to update affiliate slug: ${error.message}` };
    }

    revalidatePath('/admin/affiliates');
    revalidatePath(`/admin/affiliates/${affiliateId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateAdminAffiliateDetails (slug):', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function updateAffiliateMembershipLevel(
  userId: string,
  membershipLevelId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  try {
    const { error } = await supabase
      .from('unified_profiles')
      .update({ membership_level_id: membershipLevelId })
      .eq('id', userId)
      .select('id') // Ensure we select something to get a more specific error if the user_id doesn't exist
      .single();

    if (error) {
      console.error(`Error updating membership level for user ${userId}:`, error);
      // Check for specific error codes, e.g., if the user_id doesn't exist, though .single() should handle this with PGRST116
      if (error.code === '23503') { // Foreign key violation - if membershipLevelId is invalid (though nullable should prevent this for null)
        return { success: false, error: 'Invalid membership level ID provided.' };
      }
      return { success: false, error: `Failed to update membership level: ${error.message}` };
    }

    // Revalidation will be handled by the calling component/page
    // For example: revalidatePath(`/admin/affiliates/${affiliateId}`);
    // or revalidatePath('/admin/affiliates'); 
    return { success: true };
  } catch (err) {
    console.error(`Unexpected error updating membership level for user ${userId}:`, err);
    if (err instanceof Error) {
      return { success: false, error: `An unexpected error occurred: ${err.message}` };
    }
    return { success: false, error: 'An unexpected error occurred while updating membership level.' };
  }
}


// Interface for program settings update arguments
export interface UpdateAffiliateProgramSettingsArgs {
  cookie_duration_days?: number;
  min_payout_threshold?: number;
  terms_of_service_content?: string | null;
}

const DEFAULT_SETTINGS_FALLBACK: Omit<AffiliateProgramConfigData, 'default_commission_rate'> & { default_commission_rate?: number } = {
  cookie_duration_days: 30,
  min_payout_threshold: 50,
  terms_of_service_content: null,
  created_at: new Date().toISOString(), // Placeholder, actual value from DB
  updated_at: new Date().toISOString(), // Placeholder, actual value from DB
};

/**
 * Fetches the global affiliate program settings.
 * Converts commission rate from decimal (DB) to percentage (UI).
 */
export async function getAffiliateProgramSettings(): Promise<AffiliateProgramConfigData> {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('affiliate_program_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching affiliate program settings:', error.message);
      return { ...DEFAULT_SETTINGS_FALLBACK };
    }

    if (!data) {
      console.warn('Affiliate program settings not found, returning defaults.');
      return { ...DEFAULT_SETTINGS_FALLBACK };
    }
    
    // default_commission_rate is no longer managed here.
    // Commission rates are managed via Membership Tiers.
    return data as AffiliateProgramConfigData;

  } catch (err) {
    console.error('Unexpected error in getAffiliateProgramSettings:', err);
    return { ...DEFAULT_SETTINGS_FALLBACK };
  }
}

/**
 * Updates the global affiliate program settings.
 * Expects commission rate as percentage (UI), converts to decimal (DB).
 */
export async function updateAffiliateProgramSettings(
  settings: UpdateAffiliateProgramSettingsArgs
): Promise<{ success: boolean; data?: AffiliateProgramConfigData; error?: string }> {
  const supabase = getAdminClient();
  
  const dbUpdateData: Partial<Omit<AffiliateProgramConfigData, 'created_at' | 'updated_at' | 'id'>> = {};

  if (settings.cookie_duration_days !== undefined) {
    dbUpdateData.cookie_duration_days = settings.cookie_duration_days;
  }
  if (settings.min_payout_threshold !== undefined) {
    dbUpdateData.min_payout_threshold = settings.min_payout_threshold;
  }
  if (settings.terms_of_service_content !== undefined) {
    dbUpdateData.terms_of_service_content = settings.terms_of_service_content;
  }

  if (Object.keys(dbUpdateData).length === 0) {
    // If called with an empty settings object or only undefined values, treat as success no-op or return current settings.
    // For now, let's fetch and return current settings to reflect no change but provide data.
    const currentSettings = await getAffiliateProgramSettings();
    return { success: true, data: currentSettings, error: 'No settings provided to update.' };
  }

  try {
    const { data: updatedData, error } = await supabase
      .from('affiliate_program_config')
      .update(dbUpdateData)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Error updating affiliate program settings:', error);
      return { success: false, error: `Failed to update settings: ${error.message}` };
    }
    
    if (!updatedData) {
        return { success: false, error: 'Failed to update settings (no data returned).' };
    }

    revalidatePath('/admin/affiliates/settings');

    // Convert commission rate back to percentage for the returned data
    const uiData = {
      ...updatedData,
      default_commission_rate: updatedData.default_commission_rate * 100,
    };

    return { success: true, data: uiData as AffiliateProgramConfigData };

  } catch (err) {
    console.error('Unexpected error in updateAffiliateProgramSettings:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates the status of multiple affiliates in a single operation.
 * @param affiliateIds Array of affiliate IDs to update
 * @param newStatus The new status to set for all selected affiliates
 * @returns Object with success status, count of updated affiliates, and any error message
 */
export async function bulkUpdateAffiliateStatus(affiliateIds: string[], newStatus: AffiliateStatusType) {
  if (!affiliateIds.length) {
    return { success: false, error: 'No affiliates selected', count: 0 };
  }

  const supabase = getAdminClient();

  try {
    // Use the in() filter to update all selected affiliates at once
    const { data, error } = await supabase
      .from('affiliates')
      .update({ status: newStatus })
      .in('id', affiliateIds)
      .select('id');

    if (error) {
      console.error('Error bulk updating affiliate status:', error);
      throw new Error(`Failed to update affiliate statuses: ${error.message}`);
    }

    const updatedCount = data?.length || 0;
    
    revalidatePath('/admin/affiliates');
    return { 
      success: true, 
      count: updatedCount,
      message: `Successfully updated ${updatedCount} affiliate${updatedCount !== 1 ? 's' : ''}`
    };
  } catch (err) {
    console.error('Unexpected error in bulkUpdateAffiliateStatus:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, count: 0 };
  }
}

