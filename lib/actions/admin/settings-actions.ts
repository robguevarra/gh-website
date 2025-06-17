'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  AffiliateProgramConfigData,
  PayoutScheduleType,
} from '@/types/admin/affiliate';
import { revalidatePath } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { logAdminActivity } from '../activity-log-actions';

// Interface for program settings update arguments
export interface UpdateAffiliateProgramSettingsArgs {
  cookie_duration_days?: number;
  min_payout_threshold?: number;
  terms_of_service_content?: string | null;
  payout_schedule?: PayoutScheduleType | null; // Added
  payout_currency?: string | null; // Added
  enabled_payout_methods?: string[]; // Array of enabled payout methods
  require_verification_for_bank_transfer?: boolean; // Whether bank transfers require verification
  require_verification_for_gcash?: boolean; // Whether GCash requires verification
}

const DEFAULT_SETTINGS_FALLBACK: Omit<
  AffiliateProgramConfigData,
  'created_at' | 'updated_at'
> = {
  cookie_duration_days: 30,
  min_payout_threshold: 50,
  terms_of_service_content: null,
  payout_schedule: 'monthly', // Default payout schedule
  payout_currency: 'PHP', // Default payout currency for Philippines
  enabled_payout_methods: ['gcash'], // Default to GCash only
  require_verification_for_bank_transfer: true, // Bank transfers require verification
  require_verification_for_gcash: false, // GCash doesn't require verification by default
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
        console.error(
          'Error fetching affiliate program settings:',
          error.message
        );
        return {
          ...DEFAULT_SETTINGS_FALLBACK,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      if (!data) {
        // If no settings found, return the default settings structure
        console.warn(
          'No affiliate program settings found in DB, returning default values.'
        );
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
        cookie_duration_days:
          data.cookie_duration_days !== null
            ? Number(data.cookie_duration_days)
            : DEFAULT_SETTINGS_FALLBACK.cookie_duration_days,
        min_payout_threshold:
          data.min_payout_threshold !== null
            ? Number(data.min_payout_threshold)
            : DEFAULT_SETTINGS_FALLBACK.min_payout_threshold,
        // payout_schedule and payout_currency are optional and can be null, direct assignment from data or fallback is fine if types match.
        // If data comes from DB as potentially different types, ensure conversion or proper handling.
        payout_schedule: (data.payout_schedule ||
          DEFAULT_SETTINGS_FALLBACK.payout_schedule) as
          | PayoutScheduleType
          | null
          | undefined,
        payout_currency:
          data.payout_currency || DEFAULT_SETTINGS_FALLBACK.payout_currency,
      };

      return mergedSettings;
    } catch (err) {
      console.error('Unexpected error in getAffiliateProgramSettings:', err);
      return {
        ...DEFAULT_SETTINGS_FALLBACK,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
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
): Promise<{
  success: boolean;
  data?: AffiliateProgramConfigData;
  error?: string;
}> {
  const supabase = getAdminClient();

  const dbUpdateData: Partial<
    Omit<AffiliateProgramConfigData, 'created_at' | 'updated_at' | 'id'>
  > = {};

  if (settings.cookie_duration_days !== undefined) {
    dbUpdateData.cookie_duration_days = settings.cookie_duration_days;
  }
  if (settings.min_payout_threshold !== undefined) {
    dbUpdateData.min_payout_threshold = settings.min_payout_threshold;
  }
  if (settings.terms_of_service_content !== undefined) {
    dbUpdateData.terms_of_service_content = settings.terms_of_service_content;
  }
  if (settings.payout_schedule !== undefined) {
    dbUpdateData.payout_schedule = settings.payout_schedule;
  }
  if (settings.payout_currency !== undefined) {
    dbUpdateData.payout_currency = settings.payout_currency;
  }
  if (settings.enabled_payout_methods !== undefined) {
    dbUpdateData.enabled_payout_methods = settings.enabled_payout_methods;
  }
  if (settings.require_verification_for_bank_transfer !== undefined) {
    dbUpdateData.require_verification_for_bank_transfer = settings.require_verification_for_bank_transfer;
  }
  if (settings.require_verification_for_gcash !== undefined) {
    dbUpdateData.require_verification_for_gcash = settings.require_verification_for_gcash;
  }

  if (Object.keys(dbUpdateData).length === 0) {
    // If called with an empty settings object or only undefined values, treat as success no-op or return current settings.
    // For now, let's fetch and return current settings to reflect no change but provide data.
    const currentSettings = await getAffiliateProgramSettings();
    return {
      success: true,
      data: currentSettings,
      error: 'No settings provided to update.',
    };
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
      return {
        success: false,
        error: `Failed to update settings: ${error.message}`,
      };
    }

    if (!updatedData) {
      return {
        success: false,
        error: 'Failed to update settings (no data returned).',
      };
    }

    // Log admin activity
    await logAdminActivity({
      activity_type: 'AFFILIATE_SETTINGS_UPDATE',
      description: `Updated affiliate program settings`,
      details: {
        updatedFields: Object.keys(dbUpdateData),
        newValues: dbUpdateData,
      },
    });

    revalidatePath('/admin/affiliates/settings');

    return {
      success: true,
      data: {
        ...(updatedData as any), // Cast to any to allow spread, then override payout_schedule
        payout_schedule:
          updatedData.payout_schedule as PayoutScheduleType | null,
        // Ensure other fields that might need explicit casting are handled if necessary
        // For now, assuming only payout_schedule needs this explicit handling based on previous fixes
      } as AffiliateProgramConfigData,
    };
  } catch (err) {
    console.error('Unexpected error in updateAffiliateProgramSettings:', err);
    const errorMessage =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
} 