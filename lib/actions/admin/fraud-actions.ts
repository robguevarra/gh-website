'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  AdminFraudFlagListItem,
  FraudFlagItem,
} from '@/types/admin/affiliate';
import { revalidatePath } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { logAdminActivity } from '../activity-log-actions';

/**
 * Get fraud flags for a specific affiliate
 * @param affiliateId The ID of the affiliate to fetch fraud flags for
 * @returns A promise resolving to an object with flags array and optional error
 */
export async function getFraudFlagsForAffiliate(affiliateId: string): Promise<{ flags: AdminFraudFlagListItem[]; error?: string }> {
  try {
    const supabase = getAdminClient();
    
    const { data: flags, error } = await supabase
      .from('fraud_flags')
      .select(`
        id,
        affiliate_id,
        reason,
        details,
        resolved,
        resolved_at,
        resolver_notes,
        created_at,
        updated_at,
        affiliates(user_id, unified_profiles!affiliates_user_id_fkey(first_name, last_name, email))
      `)
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching fraud flags for affiliate:', error);
      return { flags: [], error: error.message };
    }
    
    const formattedFlags = flags.map(flag => {
      const affiliate = flag.affiliates;
      const profile = affiliate?.unified_profiles;
      
      return {
        id: flag.id,
        affiliate_id: flag.affiliate_id,
        reason: flag.reason,
        details: flag.details,
        resolved: flag.resolved,
        resolved_at: flag.resolved_at,
        resolver_notes: flag.resolver_notes,
        created_at: flag.created_at,
        updated_at: flag.updated_at,
        affiliate_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown',
        affiliate_email: profile?.email || 'No email'
      };
    });
    
    return { flags: formattedFlags };
  } catch (error) {
    console.error('Unexpected error fetching fraud flags for affiliate:', error);
    return { flags: [], error: 'Failed to fetch fraud flags' };
  }
}

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

export const getAffiliateFraudFlagsById = unstable_cache(async (affiliateId: string): Promise<{ flags: AdminFraudFlagListItem[]; error?: string }> => {
  const supabase = getAdminClient();
  try {
    // Fetch fraud flags for the specific affiliate
    const { data: fraudFlags, error } = await supabase
      .from('fraud_flags')
      .select('*, affiliates!inner(id, user_id, unified_profiles!affiliates_user_id_fkey(first_name, last_name, email))')
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
['getAffiliateFraudFlagsById'],
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