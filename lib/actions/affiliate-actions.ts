'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { AdminAffiliateListItem, AffiliateStatusType, AdminFraudFlagListItem, FraudFlagItem, AffiliateProgramConfigData, PayoutScheduleType } from '@/types/admin/affiliate';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from './activity-log-actions'; 


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
  // Direct access fields for convenience
  totalActiveAffiliates: number;
  pendingApplications: number;
  totalClicksLast30Days: number;
  totalConversionsLast30Days: number;
  totalGmvLast30Days: number;
  totalCommissionsPaidLast30Days: number;
  averageConversionRate: number;
}

export interface TopAffiliateDataPoint {
  affiliateId: string;
  name: string; // Could be Name or Slug
  value: number; // Number of conversions
  slug: string;
}


// At the top of lib/actions/affiliate-actions.ts, add:
// Assuming Database type is already available or implicitly handled by activity_log_type enum usage
// If not, and activity_log_type is directly used from Database['public']['Enums']['activity_log_type']
// we might need: import { Database } from '@/types/supabase'; // Adjust path if necessary

// ... other imports ...

export async function updateAffiliateStatus(userId: string, newStatus: AffiliateStatusType) {
  const supabase = getAdminClient();
  let oldStatus: AffiliateStatusType | undefined;
  let targetUserId: string = userId;

  try {
    // 1. Fetch current affiliate data by user_id
    const { data: affiliates, error: fetchError } = await supabase
      .from('affiliates')
      .select('id, status')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching current affiliate status:', fetchError);
      throw new Error(`Failed to fetch current affiliate data: ${fetchError.message}`);
    }
    
    // Check if we got any results
    if (!affiliates || affiliates.length === 0) {
      throw new Error(`Affiliate with user ID ${userId} not found.`);
    }
    
    const currentAffiliate = affiliates[0];
    const affiliateId = currentAffiliate.id; // Store the affiliate ID for later use
    oldStatus = currentAffiliate.status as AffiliateStatusType;

    // 2. Update affiliate status
    const { data: updatedAffiliate, error: updateError } = await supabase
      .from('affiliates')
      .update({ status: newStatus })
      .eq('id', affiliateId)
      .select('id, user_id, status') // Keep select for return consistency if needed elsewhere
      .single();

    if (updateError) {
      console.error('Error updating affiliate status:', updateError);
      throw new Error(`Failed to update affiliate status: ${updateError.message}`);
    }

    if (!updatedAffiliate) {
      // This case should ideally be caught by the fetch above, but as a safeguard:
      throw new Error('Affiliate not found after update attempt or no change made.');
    }

    // 3. Log the admin activity
    if (oldStatus !== newStatus) { // Only log if status actually changed
      await logAdminActivity({
        // admin_user_id will be fetched by logAdminActivity if not provided
        target_user_id: userId,
        target_entity_id: affiliateId,
        activity_type: 'AFFILIATE_STATUS_CHANGE', // Make sure this matches your enum definition
        description: `Affiliate status changed from ${oldStatus} to ${newStatus} for user ID ${userId}.`,
        details: { 
          affiliate_id: affiliateId,
          old_status: oldStatus,
          new_status: newStatus,
          user_id: userId
        },
        // ip_address can be added if available/needed
      });
    }

    // Revalidate affiliate pages to refresh UI after status change
    revalidatePath('/admin/affiliates');
    if (affiliateId) {
      revalidatePath(`/admin/affiliates/${affiliateId}`);
    }

    return { success: true, data: updatedAffiliate };

  } catch (err) {
    console.error('Unexpected error in updateAffiliateStatus:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}


/**
 * Get list of all affiliates with basic information for admin dashboard
 * Cached with a 60-second revalidation period
 */
export async function getAdminAffiliates(): Promise<AdminAffiliateListItem[]> {
  return getAdminAffiliatesWithCache();
}

// Cached implementation that's called by the exported function
const getAdminAffiliatesWithCache = unstable_cache(
  async (): Promise<AdminAffiliateListItem[]> => {
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
        affiliate_conversions (commission_amount)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching affiliates:', error);
      throw new Error(`Failed to fetch affiliates: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    const mappedData = data.map((item: any) => {
      const profile = item.unified_profiles;
      const memberLevel = profile?.membership_levels;

      const totalLifetimeCommissions = item.affiliate_conversions?.reduce(
        (sum: number, conversion: { commission_amount: number | null }) => sum + (conversion.commission_amount || 0),
        0
      ) || 0;

      return {
        affiliate_id: item.id,
        user_id: item.user_id,
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || item.slug || 'N/A',
        email: profile?.email || 'N/A',
        slug: item.slug,
        status: item.status,
        membership_level_name: memberLevel?.name,
        tier_commission_rate: memberLevel?.commission_rate,
        current_membership_level_id: profile?.membership_level_id,
        joined_date: item.created_at, // Will be formatted by UI if needed
        total_clicks: 0, // Placeholder - to be implemented if needed
        total_conversions: 0, // Placeholder - to be implemented if needed
        total_earnings: totalLifetimeCommissions,
        // ctr: undefined, // Placeholder for calculated metric
        // fraud_flags: [], // Placeholder, fetch if needed
      };
    });

    return mappedData as AdminAffiliateListItem[];
  } catch (err) {
    console.error('Unexpected error in getAdminAffiliates:', err);
    if (err instanceof Error) {
        throw new Error(`An unexpected error occurred: ${err.message}`);
    }
    throw new Error('An unexpected error occurred while fetching affiliates.');
  }
},
['admin-affiliates-list', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-data'] }
);

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

// Import unstable_cache from next/cache for data caching
import { unstable_cache } from 'next/cache';

/**
 * Get detailed information about a specific affiliate by ID
 * Cached with a 60-second revalidation period
 */
export async function getAdminAffiliateById(affiliateId: string): Promise<AdminAffiliateListItem | null> {
  // Use a wrapper function for caching
  return getAdminAffiliateByIdWithCache(affiliateId);
}

// Cached implementation that's called by the exported function
const getAdminAffiliateByIdWithCache = unstable_cache(
  async (affiliateId: string): Promise<AdminAffiliateListItem | null> => {
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
},
['admin-affiliate-detail', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-data'] }
);

/**
 * Get all fraud flags across the system for admin review
 * Cached with a 60-second revalidation period
 */
export async function getAllAdminFraudFlags(): Promise<{ flags: AdminFraudFlagListItem[]; error?: string }> {
  return getAllAdminFraudFlagsWithCache();
}

// Cached implementation that's called by the exported function
const getAllAdminFraudFlagsWithCache = unstable_cache(
  async (): Promise<{ flags: AdminFraudFlagListItem[]; error?: string }> => {
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
      return { flags: [], error: 'Failed to fetch fraud flags' };
    }

    if (!data) {
      return { flags: [] };
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

    return { flags: fraudFlags };

  } catch (err) {
    console.error('Unexpected error in getAllAdminFraudFlags:', err);
    return { flags: [], error: 'Failed to fetch fraud flags' };
  }
},
['admin-fraud-flags', 'affiliate-data'],
{ revalidate: 60, tags: ['fraud-flags', 'affiliate-data'] }
);

export async function resolveFraudFlag({
  flagId,
  resolutionNotes,
  resolvedById
}: {
  flagId: string;
  resolutionNotes: string;
  resolvedById?: string;
}): Promise<{ success: boolean; error?: string; data?: FraudFlagItem }> {
  const supabase = getAdminClient();
  try {
    // First, get the fraud flag to include affiliate details in our log
    const { data: fraudFlag, error: fetchError } = await supabase
      .from('fraud_flags')
      .select('id, affiliate_id')
      .eq('id', flagId)
      .single();

    if (fetchError) {
      console.error(`Error fetching fraud flag ${flagId}:`, fetchError);
      return { success: false, error: `Failed to fetch fraud flag: ${fetchError.message}` };
    }

    const { data, error } = await supabase
      .from('fraud_flags')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolver_notes: resolutionNotes,
      })
      .eq('id', flagId)
      .select()
      .single();

    if (error) {
      console.error(`Error resolving fraud flag ${flagId}:`, error);
      return { success: false, error: `Failed to resolve fraud flag: ${error.message}` };
    }

    // Note: When the admin_fraud_notifications table is properly added to the schema with TypeScript types,
    // we'll add code here to mark any associated fraud notifications as read automatically
    // For now, we're using the simplified approach that doesn't require database schema changes

    // Log admin activity after successful update
    await logAdminActivity({
      activity_type: 'FRAUD_FLAG_RESOLVED',
      description: `Resolved fraud flag (ID: ${flagId})`,
      target_entity_id: flagId,
      target_user_id: fraudFlag?.affiliate_id || null,
      details: {
        flagId,
        resolutionNotes,
        affiliateId: fraudFlag?.affiliate_id || null
      }
    });

    revalidatePath('/admin/affiliates/flags');
    // Also revalidate analytics page to update notification badge
    revalidatePath('/admin/affiliates/analytics');

    return { success: true, data: data as FraudFlagItem };
  } catch (err) {
    console.error(`Unexpected error resolving fraud flag ${flagId}:`, err);
    if (err instanceof Error) {
      return { success: false, error: `An unexpected error occurred: ${err.message}` };
    }
    return { success: false, error: 'An unexpected error occurred while resolving the fraud flag.' };
  }
}

/**
 * Create a new fraud flag for an affiliate
 */

/**
 * Get affiliate referral links for a given affiliate
 * Cached with a 60-second revalidation period
 */
export async function getAffiliateLinks(affiliateId: string): Promise<{ links: any[]; error?: string }> {
  return getAffiliateLinksWithCache(affiliateId);
}

// Cached implementation that's called by the exported function
const getAffiliateLinksWithCache = unstable_cache(
  async (affiliateId: string): Promise<{ links: any[]; error?: string }> => {
  const supabase = getAdminClient();
  try {
    // Fetch referral links
    const { data: links, error } = await supabase
      .from('affiliate_links')
      .select(`
        id,
        name,
        slug,
        url_path,
        created_at,
        is_active,
        utm_source,
        utm_medium,
        utm_campaign
      `)
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching affiliate links for ${affiliateId}:`, error);
      return { links: [], error: error.message };
    }

    // For each link, count clicks and conversions
    if (links && links.length > 0) {
      const enhancedLinks = await Promise.all(links.map(async (link: any) => {
        if (!link?.id) {
          console.error('Link object missing ID:', link);
          return {
            ...link,
            click_count: 0,
            conversion_count: 0
          };
        }

        // Count clicks
        const { count: clickCount, error: clickError } = await supabase
          .from('affiliate_clicks')
          .select('id', { count: 'exact', head: false })
          .eq('link_id', link.id);

        // Count conversions
        const { count: conversionCount, error: conversionError } = await supabase
          .from('affiliate_conversions')
          .select('id', { count: 'exact', head: false })
          .eq('link_id', link.id);

        if (clickError) console.error(`Error counting clicks for link ${link.id}:`, clickError);
        if (conversionError) console.error(`Error counting conversions for link ${link.id}:`, conversionError);

        return {
          ...link,
          click_count: clickCount || 0,
          conversion_count: conversionCount || 0
        };
      }));

      return { links: enhancedLinks };
    }

    return { links: links || [] };
  } catch (err) {
    console.error(`Error in getAffiliateLinks for affiliate ${affiliateId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { links: [], error: errorMessage };
  }
},
['affiliate-links', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-links', 'affiliate-data'] }
);

/**
 * Get all fraud flags for a specific affiliate
 * Cached with a 60-second revalidation period
 */
export async function getFraudFlagsForAffiliate(affiliateId: string): Promise<{ flags: AdminFraudFlagListItem[]; error?: string }> {
  return getFraudFlagsForAffiliateWithCache(affiliateId);
}

// Cached implementation that's called by the exported function
const getFraudFlagsForAffiliateWithCache = unstable_cache(
  async (affiliateId: string): Promise<{ flags: AdminFraudFlagListItem[]; error?: string }> => {
  const supabase = getAdminClient();
  try {
    // Fetch fraud flags for the specific affiliate
    const { data: fraudFlags, error } = await supabase
      .from('fraud_flags')
      .select(`
        *,
        affiliates!inner(id, user_id, unified_profiles!affiliates_user_id_fkey(first_name, last_name, email))
      `)
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error getting fraud flags for affiliate ${affiliateId}:`, error);
      return { flags: [], error: 'Failed to fetch fraud flags' };
    }

    // Format the fraud flag data with affiliate info
    const formattedFlags: AdminFraudFlagListItem[] = fraudFlags.map(flag => ({
      id: flag.id,
      affiliate_id: flag.affiliate_id,
      reason: flag.reason,
      details: flag.details,
      resolved: flag.resolved,
      resolved_notes: flag.resolver_notes,
      resolved_at: flag.resolved_at,
      created_at: flag.created_at,
      updated_at: flag.updated_at,
      affiliate_name: `${flag.affiliates.unified_profiles.first_name || ''} ${flag.affiliates.unified_profiles.last_name || ''}`.trim(),
      affiliate_email: flag.affiliates.unified_profiles.email
    }));

    return { flags: formattedFlags };
  } catch (err) {
    console.error(`Unexpected error fetching fraud flags for affiliate ${affiliateId}:`, err);
    return { flags: [], error: 'Failed to fetch fraud flags' };
  }
},
['affiliate-fraud-flags', 'affiliate-data'],
{ revalidate: 60, tags: ['fraud-flags', 'affiliate-data'] }
);

export async function createFraudFlag({
  affiliateId,
  reason,
  details,
  flaggedById
}: {
  affiliateId: string;
  reason: string;
  details?: Record<string, any>;
  flaggedById?: string;
}): Promise<{ success: boolean; error?: string; data?: FraudFlagItem }> {
  const supabase = getAdminClient();
  try {
    // Get affiliate details for logging/notification purposes
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .eq('id', affiliateId)
      .single();

    if (affiliateError) {
      console.error(`Error fetching affiliate ${affiliateId}:`, affiliateError);
      return { success: false, error: `Failed to fetch affiliate: ${affiliateError.message}` };
    }

    // Create the fraud flag
    const { data, error } = await supabase
      .from('fraud_flags')
      .insert({
        affiliate_id: affiliateId,
        reason,
        details,
        resolved: false,
        flagged_by_id: flaggedById
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating fraud flag for affiliate ${affiliateId}:`, error);
      return { success: false, error: `Failed to create fraud flag: ${error.message}` };
    }

    // Log admin activity after successful creation
    await logAdminActivity({
      activity_type: 'FRAUD_FLAG_CREATED',
      description: `Created fraud flag for affiliate (ID: ${affiliateId})`,
      target_entity_id: data.id,
      target_user_id: affiliate?.user_id || null,
      details: {
        flagId: data.id,
        reason,
        affiliateId
      }
    });

    // Get full affiliate info for notifications
    const { data: fullAffiliateInfo, error: fullInfoError } = await supabase
      .from('affiliates')
      .select(`
        id,
        user_id,
        unified_profiles!inner(first_name, last_name, email)
      `)
      .eq('id', affiliateId)
      .single();

    if (!fullInfoError && fullAffiliateInfo) {
      // We now have all the data needed to create a complete fraud flag item for risk assessment
      const fraudFlagWithAffiliateInfo: AdminFraudFlagListItem = {
        ...data as FraudFlagItem,
        affiliate_name: `${fullAffiliateInfo.unified_profiles.first_name || ''} ${fullAffiliateInfo.unified_profiles.last_name || ''}`.trim(),
        affiliate_email: fullAffiliateInfo.unified_profiles.email
      };
      
      // Import and process risk assessment here
      // This is a dynamic import to avoid circular dependencies
      const { assessFraudRiskLevel } = await import('@/lib/actions/fraud-notification-actions-simplified');
      
      // Assess the risk level - properly await the Promise
      const riskAssessment = await assessFraudRiskLevel(fraudFlagWithAffiliateInfo);
      
      // Log high-risk flags for notification purposes
      if (riskAssessment.level === 'high' || riskAssessment.level === 'medium') {
        console.log(`High/medium risk fraud flag detected (ID: ${data.id}, Score: ${riskAssessment.score})`);
        console.log(`Risk factors: ${riskAssessment.factors.join(', ')}`);
        
        // In the future, when the notifications table is properly set up, we would insert into it here
      }
    }

    // Revalidate paths
    revalidatePath('/admin/affiliates/flags');
    revalidatePath('/admin/affiliates/analytics'); // For notification badge
    revalidatePath(`/admin/affiliates/${affiliateId}`); // For individual affiliate view

    return { success: true, data: data as FraudFlagItem };
  } catch (err) {
    console.error(`Unexpected error creating fraud flag for affiliate ${affiliateId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    
    return { success: false, error: 'An unexpected error occurred while creating the fraud flag.' };
  }
}

/**
 * Fetches analytics data for the affiliate program dashboard.
 * @returns Promise<AffiliateAnalyticsData>
 */

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
    // Get the membership level name for logging if membershipLevelId is provided
    let membershipLevelName = membershipLevelId ? null : 'None';
    if (membershipLevelId) {
      const { data: membershipLevel } = await supabase
        .from('membership_levels')
        .select('name')
        .eq('id', membershipLevelId)
        .single();
      
      membershipLevelName = membershipLevel?.name || 'Unknown';
    }
    
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
    
    // Log admin activity
    await logAdminActivity({
      activity_type: 'MEMBERSHIP_LEVEL_UPDATE_ADMIN',
      description: `Updated affiliate membership level to "${membershipLevelName}"`,
      target_user_id: userId,
      target_entity_id: membershipLevelId,
      details: {
        userId,
        membershipLevelId,
        membershipLevelName
      }
    });

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
  payout_schedule?: PayoutScheduleType | null; // Added
  payout_currency?: string | null;             // Added
}

const DEFAULT_SETTINGS_FALLBACK: Omit<AffiliateProgramConfigData, 'created_at' | 'updated_at'> = {
  cookie_duration_days: 30,
  min_payout_threshold: 50,
  terms_of_service_content: null,
  payout_schedule: 'monthly', // Default payout schedule
  payout_currency: 'USD',     // Default payout currency
};

/**
 * Fetches the global affiliate program settings.
 * Cached with a 60-second revalidation period
 */
export async function getAffiliateProgramSettings(): Promise<AffiliateProgramConfigData> {
  return getAffiliateProgramSettingsWithCache();
}

// Cached implementation that's called by the exported function
const getAffiliateProgramSettingsWithCache = unstable_cache(
  async (): Promise<AffiliateProgramConfigData> => {
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
      // If no settings found, return the default settings structure
      console.warn('No affiliate program settings found in DB, returning default values.');
      return {
        ...DEFAULT_SETTINGS_FALLBACK,
        created_at: new Date().toISOString(), // Placeholder for type conformity
        updated_at: new Date().toISOString(), // Placeholder for type conformity
      };
    }
  
    // Ensure all expected fields are present, merging with defaults for any missing optional fields
    const mergedSettings: AffiliateProgramConfigData = {
      ...DEFAULT_SETTINGS_FALLBACK, // Provide defaults for any potentially missing optional fields
      ...data, // DB values override defaults
      // Ensure types are correct, e.g., numbers are numbers
      cookie_duration_days: data.cookie_duration_days !== null ? Number(data.cookie_duration_days) : DEFAULT_SETTINGS_FALLBACK.cookie_duration_days,
      min_payout_threshold: data.min_payout_threshold !== null ? Number(data.min_payout_threshold) : DEFAULT_SETTINGS_FALLBACK.min_payout_threshold,
      // payout_schedule and payout_currency are optional and can be null, direct assignment from data or fallback is fine if types match.
      // If data comes from DB as potentially different types, ensure conversion or proper handling.
      payout_schedule: data.payout_schedule || DEFAULT_SETTINGS_FALLBACK.payout_schedule,
      payout_currency: data.payout_currency || DEFAULT_SETTINGS_FALLBACK.payout_currency,
    };

    return mergedSettings;
  } catch (err) {
    console.error('Unexpected error in getAffiliateProgramSettings:', err);
    return { ...DEFAULT_SETTINGS_FALLBACK };
  }
},
['affiliate-program-settings', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-settings'] }
);

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
    
    // Log admin activity
    await logAdminActivity({
      activity_type: 'AFFILIATE_SETTINGS_UPDATE',
      description: `Updated affiliate program settings`,
      details: {
        updatedFields: Object.keys(dbUpdateData),
        newValues: dbUpdateData
      }
    });

    revalidatePath('/admin/affiliates/settings');

    return { success: true, data: updatedData as AffiliateProgramConfigData };

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

