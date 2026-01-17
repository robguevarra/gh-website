'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  AdminAffiliateListItem,
  AffiliateStatusType,
  AdminFraudFlagListItem,
  FraudFlagItem,
  AffiliateProgramConfigData,
  PayoutScheduleType,
  GCashVerificationStatus
} from '@/types/admin/affiliate';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from './activity-log-actions';
import { unstable_cache } from 'next/cache';
import { assignTagsToUsers } from '@/lib/supabase/data-access/tags';


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
/**
 * Get affiliate statistics for the admin dashboard
 * Returns counts for total, active, pending affiliates and growth metrics
 * Uses parallel queries for better performance and includes robust error handling
 */
export async function getAffiliateStats() {
  const supabase = getAdminClient();

  try {
    // Validate client connection first
    if (!supabase) {
      throw new Error('Supabase admin client not initialized');
    }

    // Get date boundary for growth calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Execute all queries in parallel for better performance
    // This also helps isolate which specific query might be failing
    const [
      totalResult,
      activeResult,
      pendingResult,
      newResult
    ] = await Promise.allSettled([
      // Total affiliates count
      supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true }),

      // Active affiliates count
      supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Pending applications count
      supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // New affiliates this month
      supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())
    ]);

    // Initialize default values
    let totalAffiliates = 0;
    let activeAffiliates = 0;
    let pendingApplications = 0;
    let newThisMonth = 0;

    // Process results with individual error handling
    if (totalResult.status === 'fulfilled') {
      const { count, error } = totalResult.value;
      if (error) {
        console.error('Error fetching total affiliates:', error);
      } else {
        totalAffiliates = count || 0;
      }
    } else {
      console.error('Failed to fetch total affiliates:', totalResult.reason);
    }

    if (activeResult.status === 'fulfilled') {
      const { count, error } = activeResult.value;
      if (error) {
        console.error('Error fetching active affiliates:', error);
      } else {
        activeAffiliates = count || 0;
      }
    } else {
      console.error('Failed to fetch active affiliates:', activeResult.reason);
    }

    if (pendingResult.status === 'fulfilled') {
      const { count, error } = pendingResult.value;
      if (error) {
        console.error('Error fetching pending applications:', error);
      } else {
        pendingApplications = count || 0;
      }
    } else {
      console.error('Failed to fetch pending applications:', pendingResult.reason);
    }

    if (newResult.status === 'fulfilled') {
      const { count, error } = newResult.value;
      if (error) {
        console.error('Error fetching new affiliates:', error);
      } else {
        newThisMonth = count || 0;
      }
    } else {
      console.error('Failed to fetch new affiliates:', newResult.reason);
    }

    // Calculate growth percentage with safe math
    const previousMonth = Math.max(1, totalAffiliates - newThisMonth);
    const growthPercentage = previousMonth > 0 ?
      ((newThisMonth / previousMonth) * 100) : 0;

    return {
      totalAffiliates,
      activeAffiliates,
      pendingApplications,
      newThisMonth,
      growthPercentage: Math.round(growthPercentage * 10) / 10, // Round to 1 decimal
    };
  } catch (err) {
    console.error('Critical error in getAffiliateStats:', err);

    // Return fallback data instead of throwing to prevent page crashes
    // The UI component already handles displaying error messages
    return {
      totalAffiliates: 0,
      activeAffiliates: 0,
      pendingApplications: 0,
      newThisMonth: 0,
      growthPercentage: 0,
    };
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
    // First, get the affiliate and their user_id
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .eq('id', affiliateId)
      .single();

    if (fetchError || !affiliate) {
      console.error('Error fetching affiliate:', fetchError);
      return { success: false, error: `Failed to fetch affiliate: ${fetchError?.message || 'Affiliate not found'}` };
    }

    // Update affiliate status to active
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({ status: 'active' })
      .eq('id', affiliateId)
      .select('id')
      .single();

    if (updateError) {
      console.error('Error updating affiliate status:', updateError);
      return { success: false, error: `Failed to approve affiliate: ${updateError.message}` };
    }

    // Automatically tag the user with "Affiliate" tag
    try {
      const AFFILIATE_TAG_ID = '9569c2bd-6b05-44f2-a422-054bfddc0516'; // Pre-existing "Affiliate" tag ID

      await assignTagsToUsers({
        tagIds: [AFFILIATE_TAG_ID],
        userIds: [affiliate.user_id]
      });

      console.log(`Successfully tagged user ${affiliate.user_id} with 'Affiliate' tag after approval`);
    } catch (tagError) {
      console.error('Failed to tag approved affiliate:', tagError);
      // Don't fail the approval process due to tagging error - approval is more critical
      // The affiliate is still approved, just without the automatic tag
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

/**
 * Bulk approve multiple affiliates by their IDs
 * This function processes affiliates in parallel for better performance
 */
export async function bulkApproveAffiliates(affiliateIds: string[]): Promise<{
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
}> {
  if (!affiliateIds || affiliateIds.length === 0) {
    return { success: false, successCount: 0, failedCount: 0, errors: ['No affiliate IDs provided'] };
  }

  const supabase = getAdminClient();
  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  try {
    const AFFILIATE_TAG_ID = '9569c2bd-6b05-44f2-a422-054bfddc0516'; // Pre-existing "Affiliate" tag ID

    // First, get all affiliate data including user_ids for tagging
    const { data: affiliates, error: fetchError } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .in('id', affiliateIds);

    if (fetchError) {
      throw new Error(`Failed to fetch affiliate data: ${fetchError.message}`);
    }

    if (!affiliates || affiliates.length === 0) {
      throw new Error('No affiliates found with the provided IDs');
    }

    // Process all approvals in parallel for better performance
    const approvalPromises = affiliateIds.map(async (affiliateId) => {
      try {
        const { error } = await supabase
          .from('affiliates')
          .update({ status: 'active' })
          .eq('id', affiliateId)
          .select('id')
          .single();

        if (error) {
          throw new Error(`Failed to approve affiliate ${affiliateId}: ${error.message}`);
        }

        return { success: true, affiliateId };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Unknown error for affiliate ${affiliateId}`;
        return { success: false, affiliateId, error: errorMessage };
      }
    });

    // Wait for all approval operations to complete
    const results = await Promise.all(approvalPromises);

    // Process results and collect errors
    const successfulAffiliateIds: string[] = [];
    results.forEach((result) => {
      if (result.success) {
        successCount++;
        successfulAffiliateIds.push(result.affiliateId);
      } else {
        failedCount++;
        errors.push(result.error || `Failed to approve affiliate ${result.affiliateId}`);
      }
    });

    // Bulk tag all successfully approved affiliates
    if (successfulAffiliateIds.length > 0) {
      try {
        // Get user_ids for successfully approved affiliates
        const successfulUserIds = affiliates
          .filter(affiliate => successfulAffiliateIds.includes(affiliate.id))
          .map(affiliate => affiliate.user_id);

        if (successfulUserIds.length > 0) {
          await assignTagsToUsers({
            tagIds: [AFFILIATE_TAG_ID],
            userIds: successfulUserIds
          });

          console.log(`Successfully tagged ${successfulUserIds.length} users with 'Affiliate' tag after bulk approval`);
        }
      } catch (tagError) {
        console.error('Failed to tag approved affiliates during bulk operation:', tagError);
        // Don't fail the entire operation due to tagging error
        // Add a warning to the errors array instead
        errors.push(`Warning: Failed to tag ${successfulAffiliateIds.length} approved affiliates - they are approved but not tagged`);
      }
    }

    // Log the bulk operation for audit purposes
    try {
      await logAdminActivity({
        activity_type: 'GENERAL_ADMIN_ACTION',
        description: `Bulk approved ${successCount} affiliates. ${failedCount} failed.`,
        details: {
          action: 'BULK_AFFILIATE_APPROVAL',
          affiliate_ids: affiliateIds,
          success_count: successCount,
          failed_count: failedCount,
          errors: errors.length > 0 ? errors : undefined
        },
      });
    } catch (logError) {
      console.error('Failed to log bulk approval activity:', logError);
      // Don't fail the operation due to logging error
    }

    // Revalidate affiliate pages to refresh UI
    revalidatePath('/admin/affiliates');

    const overallSuccess = failedCount === 0;
    return {
      success: overallSuccess,
      successCount,
      failedCount,
      errors
    };

  } catch (err) {
    console.error('Unexpected error in bulkApproveAffiliates:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during bulk approval.';
    return {
      success: false,
      successCount: 0,
      failedCount: affiliateIds.length,
      errors: [errorMessage]
    };
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
        payout_method,
        gcash_number,
        gcash_name,
        gcash_verified,
        bank_name,
        account_number,
        account_holder_name,
        bank_account_verified,
        unified_profiles!affiliates_user_id_fkey (
          email,
          first_name,
          last_name,
          membership_level_id,
          membership_levels (name, commission_rate)
        ),
        gcash_verifications!gcash_verifications_affiliate_id_fkey (
          status,
          created_at
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

      // Get the latest GCash verification status
      const latestVerification = data.gcash_verifications?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

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

        // Payout information
        payout_method: data.payout_method || undefined,
        gcash_number: data.gcash_number || undefined,
        gcash_name: data.gcash_name || undefined,
        gcash_verified: data.gcash_verified ?? undefined,
        gcash_verification_status: (latestVerification?.status as GCashVerificationStatus) || 'unverified',
        bank_name: data.bank_name || undefined,
        account_number: data.account_number || undefined,
        account_holder_name: data.account_holder_name || undefined,
        bank_account_verified: data.bank_account_verified ?? undefined,

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



