'use server';

import { getAdminClient } from '@/lib/supabase/admin';


export interface MembershipLevelData {
  id: string;
  name: string;
  commission_rate: number | null; // Assuming commission_rate can be null
}

/**
 * Fetches all membership levels with their commission rates.
 * @returns A promise that resolves to an array of MembershipLevelData or an empty array if an error occurs.
 */
export async function getMembershipLevels(): Promise<MembershipLevelData[]> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('membership_levels')
      .select('id, name, commission_rate')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching membership levels:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    console.error('Error in getMembershipLevels catch block:', errorMessage);
    return [];
  }
}

export interface UpdateMembershipLevelCommissionRateArgs {
  id: string;
  commission_rate: number | null;
}

/**
 * Updates the commission rates for multiple membership levels.
 * @param rates An array of objects, each containing 'id' and 'commission_rate'.
 * @returns A promise that resolves to an object indicating success or failure with an optional error message.
 */
export async function updateMembershipLevelCommissionRates(
  rates: UpdateMembershipLevelCommissionRateArgs[]
): Promise<{ success: boolean; error?: string }> {
  if (!rates || rates.length === 0) {
    return { success: true }; // No rates to update
  }

  const supabase = getAdminClient();
  let overallSuccess = true;
  const errors: string[] = [];

  for (const rateInfo of rates) {
    if (typeof rateInfo.id !== 'string' || (typeof rateInfo.commission_rate !== 'number' && rateInfo.commission_rate !== null)) {
      errors.push(`Invalid data for tier ID ${rateInfo.id}: commission_rate must be a number or null.`);
      overallSuccess = false;
      continue;
    }
    // Ensure commission rate is not negative if not null
    if (rateInfo.commission_rate !== null && rateInfo.commission_rate < 0) {
        errors.push(`Invalid commission rate for tier ID ${rateInfo.id}: rate cannot be negative.`);
        overallSuccess = false;
        continue;
    }

    const { error } = await supabase
      .from('membership_levels')
      .update({ commission_rate: rateInfo.commission_rate })
      .eq('id', rateInfo.id);

    if (error) {
      console.error(`Error updating commission rate for membership level ${rateInfo.id}:`, error.message);
      errors.push(`Failed to update tier ${rateInfo.id}: ${error.message}`);
      overallSuccess = false;
    }
  }

  if (!overallSuccess) {
    return { success: false, error: errors.join('\n') };
  }

  return { success: true };
}

// Future action to update an affiliate's membership level
// export async function updateAffiliateMembershipLevel(
//   affiliateUserId: string, 
//   newMembershipLevelId: string | null
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     const supabase = getAdminClient();
    
//     // We need to update the unified_profiles table
//     const { error } = await supabase
//       .from('unified_profiles')
//       .update({ membership_level_id: newMembershipLevelId })
//       .eq('user_id', affiliateUserId); // Assuming unified_profiles.user_id links to affiliates.user_id

//     if (error) {
//       logError('updateAffiliateMembershipLevel', error);
//       return { success: false, error: error.message };
//     }

//     return { success: true };
//   } catch (err) {
//     logError('updateAffiliateMembershipLevel', err);
//     // Check if err is an Error instance before accessing message property
//     const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
//     return { success: false, error: errorMessage };
//   }
// }
