import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Type for membership tier levels
 */
export type MembershipTierLevel =
  | 'Course Enrollee Tier'
  | 'Network Partner Tier'
  | 'Standard Affiliate Tier'
  | 'Secondary Commission Tier'
  | 'Network Elite Tier';

/**
 * Enum for membership tier names with corresponding commission rates
 */
export enum MembershipTier {
  COURSE_ENROLLEE = 'Course Enrollee Tier', // 25%
  NETWORK_PARTNER = 'Network Partner Tier', // 30%
  STANDARD_AFFILIATE = 'Standard Affiliate Tier', // 20%
  SECONDARY_COMMISSION = 'Secondary Commission Tier', // 10%
  NETWORK_ELITE = 'Network Elite Tier', // 35%
}

/**
 * Interface for a membership level
 */
export interface MembershipLevel {
  id: string;
  name: MembershipTierLevel;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

/**
 * Type for membership tier assignment parameters
 */
type AssignMembershipTierParams = {
  supabase: SupabaseClient;
  userId: string;
  tierName: MembershipTierLevel;
  notes?: string;
};

/**
 * Type for checking course enrollment parameters
 */
type CheckCourseEnrollmentParams = {
  supabase: SupabaseClient;
  userId: string;
};

/**
 * Get a membership level by name
 * @param params Object containing Supabase client and tier name
 * @returns Membership level object if found, null otherwise
 */
export const getMembershipTierByName = async ({
  supabase,
  tierName,
}: {
  supabase: SupabaseClient;
  tierName: MembershipTierLevel;
}): Promise<MembershipLevel | null> => {
  try {
    const { data, error } = await supabase
      .from('membership_levels')
      .select('*')
      .eq('name', tierName)
      .single();

    if (error) {
      console.error('Error fetching membership tier:', error);
      return null;
    }

    return data as MembershipLevel;
  } catch (error) {
    console.error('Error in getMembershipTierByName:', error);
    return null;
  }
};

/**
 * Fetch all available membership tiers
 * @param supabase Supabase client
 * @returns Array of membership level objects
 */
export const getAllMembershipTiers = async (
  supabase: SupabaseClient
): Promise<MembershipLevel[]> => {
  try {
    const { data, error } = await supabase
      .from('membership_levels')
      .select('*')
      .order('commission_rate', { ascending: false });

    if (error) {
      console.error('Error fetching membership tiers:', error);
      return [];
    }

    return data as MembershipLevel[];
  } catch (error) {
    console.error('Error in getAllMembershipTiers:', error);
    return [];
  }
};

/**
 * Assign a membership tier to a user
 * @param params Object containing Supabase client, user ID, tier name, and optional notes
 * @returns Object with success flag and message
 */
export const assignMembershipTier = async ({
  supabase,
  userId,
  tierName,
  notes,
}: AssignMembershipTierParams): Promise<{ success: boolean; message: string }> => {
  try {
    // Get the membership level ID
    const membershipLevel = await getMembershipTierByName({ supabase, tierName });

    if (!membershipLevel) {
      return {
        success: false,
        message: `Membership tier '${tierName}' not found`,
      };
    }

    // Update the user's profile with the new membership level
    const { error } = await supabase
      .from('unified_profiles')
      .update({
        membership_level_id: membershipLevel.id,
        tier_assignment_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return {
        success: false,
        message: `Failed to assign membership tier: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Successfully assigned ${tierName} to user`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Error assigning membership tier: ${errorMessage}`,
    };
  }
};

/**
 * Assign the default tier (Standard Affiliate Tier) to a new affiliate
 * @param params Object containing Supabase client and user ID
 * @returns Object with success flag and message
 */
export const assignDefaultTier = async ({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ success: boolean; message: string }> => {
  return assignMembershipTier({
    supabase,
    userId,
    tierName: MembershipTier.STANDARD_AFFILIATE,
    notes: 'Default tier assigned for new affiliate',
  });
};

/**
 * Check if a user is enrolled in a course and assign the appropriate tier
 * @param params Object containing Supabase client and user ID
 * @returns Object with success flag, whether user is enrolled, and message
 */
export const checkAndAssignCourseEnrolleeTier = async ({
  supabase,
  userId,
}: CheckCourseEnrollmentParams): Promise<{
  success: boolean;
  isEnrolled: boolean;
  message: string;
}> => {
  try {
    // Check if the user is enrolled in any course
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      return {
        success: false,
        isEnrolled: false,
        message: `Failed to check course enrollment: ${error.message}`,
      };
    }

    const isEnrolled = enrollments && enrollments.length > 0;

    // If enrolled, assign the Course Enrollee Tier
    if (isEnrolled) {
      const result = await assignMembershipTier({
        supabase,
        userId,
        tierName: MembershipTier.COURSE_ENROLLEE,
        notes: 'Automatically assigned as course enrollee',
      });

      return {
        ...result,
        isEnrolled: true,
      };
    }

    return {
      success: true,
      isEnrolled: false,
      message: 'User is not enrolled in any course',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      isEnrolled: false,
      message: `Error checking course enrollment: ${errorMessage}`,
    };
  }
};

/**
 * Get a user's current membership tier
 * @param params Object containing Supabase client and user ID
 * @returns Membership tier information if found, null otherwise
 */
export const getUserMembershipTier = async ({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ tierLevel: MembershipLevel; assignmentNotes?: string } | null> => {
  try {
    const { data, error } = await supabase
      .from('unified_profiles')
      .select(`
        membership_level_id,
        tier_assignment_notes,
        membership_levels:membership_level_id(*)
      `)
      .eq('id', userId)
      .single();

    if (error || !data || !data.membership_levels) {
      console.error('Error fetching user membership tier:', error);
      return null;
    }

    // Ensure we're handling the membership_levels data correctly
    const membershipLevel = data.membership_levels as unknown;
    if (!membershipLevel || typeof membershipLevel !== 'object') {
      console.error('Invalid membership level data structure');
      return null;
    }

    return {
      tierLevel: membershipLevel as MembershipLevel,
      assignmentNotes: data.tier_assignment_notes,
    };
  } catch (error) {
    console.error('Error in getUserMembershipTier:', error);
    return null;
  }
};
