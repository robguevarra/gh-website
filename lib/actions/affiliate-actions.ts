'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { 
  AdminAffiliateListItem, 
  AffiliateStatusType, 
  AdminFraudFlagListItem, 
  FraudFlagItem, 
  AffiliateProgramConfigData, 
  PayoutScheduleType
} from '@/types/admin/affiliate';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from './activity-log-actions'; 
import { unstable_cache } from 'next/cache';


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
 * Get affiliate program statistics for admin dashboard
 */
export async function getAffiliateStats() {
  const supabase = getAdminClient();

  try {
    // Get total affiliates count
    const { count: totalAffiliates, error: totalError } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw new Error(`Failed to fetch total affiliates: ${totalError.message}`);

    // Get active affiliates count
    const { count: activeAffiliates, error: activeError } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeError) throw new Error(`Failed to fetch active affiliates: ${activeError.message}`);

    // Get pending applications count
    const { count: pendingApplications, error: pendingError } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) throw new Error(`Failed to fetch pending applications: ${pendingError.message}`);

    // Get affiliates created in the last 30 days for growth calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: newThisMonth, error: newError } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (newError) throw new Error(`Failed to fetch new affiliates: ${newError.message}`);

    // Calculate growth percentage (mock calculation for now)
    const previousMonth = Math.max(1, (totalAffiliates || 0) - (newThisMonth || 0));
    const growthPercentage = previousMonth > 0 ? 
      ((newThisMonth || 0) / previousMonth * 100) : 0;

    return {
      totalAffiliates: totalAffiliates || 0,
      activeAffiliates: activeAffiliates || 0,
      pendingApplications: pendingApplications || 0,
      newThisMonth: newThisMonth || 0,
      growthPercentage: Math.round(growthPercentage * 10) / 10, // Round to 1 decimal
    };
  } catch (err) {
    console.error('Error fetching affiliate stats:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch affiliate statistics');
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
        payout_method,
        gcash_verified,
        bank_account_verified,
        unified_profiles!affiliates_user_id_fkey (
          email,
          first_name,
          last_name,
          membership_level_id,
          membership_levels (name, commission_rate)
        ),
        affiliate_conversions (commission_amount),
        gcash_verifications!gcash_verifications_affiliate_id_fkey (
          status,
          created_at
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

    const mappedData = data.map((item: any) => {
      const profile = item.unified_profiles;
      const memberLevel = profile?.membership_levels;

      const totalLifetimeCommissions = item.affiliate_conversions?.reduce(
        (sum: number, conversion: { commission_amount: number | null }) => sum + (conversion.commission_amount || 0),
        0
      ) || 0;

      // Get the latest GCash verification status
      const latestVerification = item.gcash_verifications?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

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
        
        // Payout information
        payout_method: item.payout_method,
        gcash_verified: item.gcash_verified,
        gcash_verification_status: latestVerification?.status || 'unverified',
        bank_account_verified: item.bank_account_verified,
        
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
      .update({ status: 'inactive' }) // 'inactive' might be a better status than 'rejected' for general use
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
    if (err instanceof Error) {
      return { success: false, error: `An unexpected error occurred: ${err.message}` };
    }
    return { success: false, error: 'An unexpected error occurred while rejecting the affiliate.' };
  }
}

export async function flagAffiliate(affiliateId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from('affiliates')
      .update({ status: 'flagged' })
      .eq('id', affiliateId);

    if (error) {
      console.error('Error flagging affiliate:', error);
      return { success: false, error: `Failed to flag affiliate: ${error.message}` };
    }

    // Here you might want to add a new record to the `fraud_flags` table
    // For now, this is just a status update on the `affiliates` table
    // Example: createFraudFlag({ affiliate_id: affiliateId, reason: 'Manual flagging by admin' });

    revalidatePath('/admin/affiliates');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in flagAffiliate:', err);
    if (err instanceof Error) {
      return { success: false, error: `An unexpected error occurred: ${err.message}` };
    }
    return { success: false, error: 'An unexpected error occurred while flagging the affiliate.' };
  }
}

/**
 * Get detailed information for a specific affiliate for admin view
 * Cached with a 60-second revalidation period
 */
export async function getAdminAffiliateById(affiliateId: string): Promise<AdminAffiliateListItem | null> {
  return getAdminAffiliateByIdWithCache(affiliateId);
}

// Cached implementation that's called by the exported function
const getAdminAffiliateByIdWithCache = unstable_cache(
  async (affiliateId: string): Promise<AdminAffiliateListItem | null> => {
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('affiliates')
        .select(
          `
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
      `
        )
      .eq('id', affiliateId)
      .single();

    if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          console.warn(`No affiliate found with ID: ${affiliateId}`);
        return null;
      }
        console.error('Error fetching affiliate details:', error);
        throw new Error(`Failed to fetch affiliate details: ${error.message}`);
    }

    if (!data) {
      return null;
    }

      // Fetch metrics directly
      const { count: total_clicks, error: clicksError } = await supabase
      .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliateId);

      const { data: conversionsData, error: conversionsError } = await supabase
      .from('affiliate_conversions')
        .select('commission_amount')
      .eq('affiliate_id', affiliateId);

      if (clicksError || conversionsError) {
        console.error('Error fetching metrics:', clicksError || conversionsError);
        // Decide if this is a fatal error or if you can proceed without metrics
      }

      const total_conversions = conversionsData?.length || 0;
      const total_earnings =
        conversionsData?.reduce((sum, conv) => sum + (conv.commission_amount || 0), 0) || 0;
      const ctr = total_clicks && total_conversions ? (total_conversions / total_clicks) * 100 : 0;

      const profile = data.unified_profiles;
      const memberLevel = profile?.membership_levels;

      const affiliateDetails: AdminAffiliateListItem = {
      affiliate_id: data.id,
      user_id: data.user_id,
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || data.slug || 'N/A',
      email: profile?.email || 'N/A',
      slug: data.slug,
        status: data.status,
        membership_level_name: memberLevel?.name,
        tier_commission_rate: memberLevel?.commission_rate,
        current_membership_level_id: profile?.membership_level_id,
        joined_date: data.created_at,
        total_clicks: total_clicks || 0,
        total_conversions: total_conversions,
        total_earnings: total_earnings,
        ctr: ctr,
        fraud_flags: [], // Placeholder, fraud flags should be fetched separately if needed on this view.
      };

      return affiliateDetails;
  } catch (err) {
      console.error(`Unexpected error fetching affiliate details for ID ${affiliateId}:`, err);
    if (err instanceof Error) {
        throw new Error(`An unexpected error occurred: ${err.message}`);
    }
    throw new Error('An unexpected error occurred while fetching affiliate details.');
  }
},
['admin-affiliate-detail', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-data'] }
);

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
    const { data, error } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_id', affiliateId);

    if (error) {
      console.error(`Error fetching links for affiliate ${affiliateId}:`, error);
      return { links: [], error: 'Failed to fetch affiliate links' };
    }
    return { links: data || [] };
  } catch (err) {
    console.error(`Unexpected error fetching links for affiliate ${affiliateId}:`, err);
    if (err instanceof Error) {
        return { links: [], error: `An unexpected error occurred: ${err.message}` };
    }
    return { links: [], error: 'An unexpected error occurred while fetching links.' };
  }
},
['affiliate-links', 'affiliate-data'],
{ revalidate: 60, tags: ['affiliate-links', 'affiliate-data'] }
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



