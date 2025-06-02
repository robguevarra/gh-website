import { SupabaseClient } from '@supabase/supabase-js';
import { conversionStatusSchema } from '@/lib/validation/affiliate/conversion-schema';

/**
 * Type for conversion status update parameters
 */
type ConversionStatusUpdateParams = {
  supabase: SupabaseClient;
  conversionId: string;
  newStatus: 'pending' | 'cleared' | 'paid' | 'flagged';
  notes?: string;
};

/**
 * Type for batch conversion status update parameters
 */
type BatchConversionStatusUpdateParams = {
  supabase: SupabaseClient;
  conversionIds: string[];
  newStatus: 'pending' | 'cleared' | 'paid' | 'flagged';
  notes?: string;
};

/**
 * Type for conversion status history entry
 */
type StatusHistoryEntry = {
  timestamp: string;
  oldStatus: string;
  newStatus: string;
  notes?: string;
};

/**
 * Update the status of a conversion record
 * @param params Object containing Supabase client, conversion ID, new status, and optional notes
 * @returns Object with success flag and message
 */
export const updateConversionStatus = async ({
  supabase,
  conversionId,
  newStatus,
  notes,
}: ConversionStatusUpdateParams): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate the new status
    if (!conversionStatusSchema.safeParse(newStatus).success) {
      return {
        success: false,
        message: `Invalid status: ${newStatus}`,
      };
    }

    // Get the current status of the conversion
    const { data: conversion, error: fetchError } = await supabase
      .from('affiliate_conversions')
      .select('status, status_history')
      .eq('id', conversionId)
      .single();

    if (fetchError) {
      return {
        success: false,
        message: `Failed to fetch conversion: ${fetchError.message}`,
      };
    }

    // If the status hasn't changed, there's nothing to do
    if (conversion.status === newStatus) {
      return {
        success: true,
        message: `Conversion status is already ${newStatus}`,
      };
    }

    // Create a history entry for the status change
    const statusHistoryEntry: StatusHistoryEntry = {
      timestamp: new Date().toISOString(),
      oldStatus: conversion.status,
      newStatus,
      ...(notes && { notes }),
    };

    // Get current status history or initialize it
    const currentHistory = conversion.status_history || [];
    const updatedHistory = [...currentHistory, statusHistoryEntry];

    // Update the conversion with the new status and history
    const { error: updateError } = await supabase
      .from('affiliate_conversions')
      .update({
        status: newStatus,
        status_history: updatedHistory,
      })
      .eq('id', conversionId);

    if (updateError) {
      return {
        success: false,
        message: `Failed to update conversion status: ${updateError.message}`,
      };
    }

    return {
      success: true,
      message: `Conversion status updated to ${newStatus}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Error updating conversion status: ${errorMessage}`,
    };
  }
};

/**
 * Update the status of multiple conversion records in batch
 * @param params Object containing Supabase client, conversion IDs, new status, and optional notes
 * @returns Object with success count, error count, and results array
 */
export const batchUpdateConversionStatus = async ({
  supabase,
  conversionIds,
  newStatus,
  notes,
}: BatchConversionStatusUpdateParams): Promise<{
  totalCount: number;
  successCount: number;
  errorCount: number;
  results: Array<{ id: string; success: boolean; message: string }>;
}> => {
  const results: Array<{ id: string; success: boolean; message: string }> = [];
  let successCount = 0;
  let errorCount = 0;

  // Process each conversion ID sequentially
  // We could use Promise.all for concurrent processing, but sequential is safer for database integrity
  for (const conversionId of conversionIds) {
    const result = await updateConversionStatus({
      supabase,
      conversionId,
      newStatus,
      notes,
    });

    results.push({
      id: conversionId,
      success: result.success,
      message: result.message,
    });

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  return {
    totalCount: conversionIds.length,
    successCount,
    errorCount,
    results,
  };
};

/**
 * Get the status history of a conversion
 * @param params Object containing Supabase client and conversion ID
 * @returns Status history array if found, null otherwise
 */
export const getConversionStatusHistory = async ({
  supabase,
  conversionId,
}: {
  supabase: SupabaseClient;
  conversionId: string;
}): Promise<StatusHistoryEntry[] | null> => {
  try {
    const { data, error } = await supabase
      .from('affiliate_conversions')
      .select('status_history')
      .eq('id', conversionId)
      .single();

    if (error || !data) {
      console.error('Error fetching conversion status history:', error);
      return null;
    }

    return data.status_history || [];
  } catch (error) {
    console.error('Error getting conversion status history:', error);
    return null;
  }
};
