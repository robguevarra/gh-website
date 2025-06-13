'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  AdminAffiliatePayout,
  AdminAffiliatePayoutDetail,
  PayoutItemDetail,
  PayoutVerificationDetail,
  PayoutStatusType,
  AdminPayoutBatch,
  PayoutBatchStats,
  PayoutBatchStatusType,
  AffiliateConversion,
  ConversionStatusType,
} from '@/types/admin/affiliate';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';
import { xenditDisbursementService, XenditUtils } from '@/lib/services/xendit/disbursement-service';  

interface GetAdminAffiliatePayoutsFilters {
  status?: PayoutStatusType;
  affiliateId?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
  scheduledAtStart?: string;
  scheduledAtEnd?: string;
}

interface GetAdminAffiliatePayoutsPagination {
  page?: number;
  pageSize?: number;
}

interface GetAdminAffiliatePayoutsSort {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

interface GetAdminAffiliatePayoutsResult {
  data: AdminAffiliatePayout[];
  totalCount: number;
  error?: string | null;
}

/**
 * Fetches affiliate payouts for the admin interface with filtering, pagination, and sorting.
 */
export async function getAdminAffiliatePayouts({
  filters = {},
  pagination = { page: 1, pageSize: 10 },
  sort = { sortBy: 'created_at', sortDirection: 'desc' },
}: {
  filters?: GetAdminAffiliatePayoutsFilters;
  pagination?: GetAdminAffiliatePayoutsPagination;
  sort?: GetAdminAffiliatePayoutsSort;
}): Promise<GetAdminAffiliatePayoutsResult> {
  const supabase = getAdminClient();
  const { page = 1, pageSize = 10 } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('affiliate_payouts')
      .select(
        `
        id,
        affiliate_id,
        amount,
        status,
        payout_method,
        reference,
        transaction_date,
        created_at,
        scheduled_at,
        processed_at,
        xendit_disbursement_id,
        processing_notes,
        fee_amount,
        net_amount,
        affiliates (
          user_id,
          unified_profiles!affiliates_user_id_fkey (
            first_name,
            last_name,
            email
          )
        )
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status as any);
    }
    if (filters.affiliateId) {
      query = query.eq('affiliate_id', filters.affiliateId);
    }
    if (filters.createdAtStart) {
      query = query.gte('created_at', filters.createdAtStart);
    }
    if (filters.createdAtEnd) {
      query = query.lte('created_at', filters.createdAtEnd);
    }
    if (filters.scheduledAtStart) {
      query = query.gte('scheduled_at', filters.scheduledAtStart);
    }
    if (filters.scheduledAtEnd) {
      query = query.lte('scheduled_at', filters.scheduledAtEnd);
    }

    // Apply sorting
    if (sort.sortBy && sort.sortDirection) {
        const directSortableFields = ['created_at', 'amount_due', 'status', 'scheduled_at', 'processed_at', 'updated_at'];
        if (directSortableFields.includes(sort.sortBy)) {
             query = query.order(sort.sortBy, { ascending: sort.sortDirection === 'asc' });
        } else {
            console.warn(`Sorting by ${sort.sortBy} on affiliate_payouts is not directly supported for joined fields in this version. Defaulting to created_at desc.`);
            query = query.order('created_at', { ascending: false });
        }
    } else {
        query = query.order('created_at', { ascending: false }); // Default sort
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data: rawPayouts, error, count } = await query;

    if (error) {
      console.error('Error fetching admin affiliate payouts:', error);
      throw error;
    }

    const transformedData: AdminAffiliatePayout[] = (rawPayouts || []).map((p: any) => ({
      payout_id: p.id, 
      affiliate_id: p.affiliate_id,
      affiliate_name: p.affiliates?.unified_profiles ? `${p.affiliates.unified_profiles.first_name || ''} ${p.affiliates.unified_profiles.last_name || ''}`.trim() || 'N/A' : 'N/A',
      affiliate_email: p.affiliates?.unified_profiles?.email || 'N/A',
      amount: p.amount,
      status: p.status as PayoutStatusType,
      payout_method: p.payout_method || 'bank_transfer',
      reference: p.reference,
      transaction_date: p.transaction_date,
      created_at: p.created_at,
      processed_at: p.processed_at,
      xendit_disbursement_id: p.xendit_disbursement_id,
      processing_notes: p.processing_notes,
      fee_amount: p.fee_amount,
      net_amount: p.net_amount,
      // Ensure all fields from AdminAffiliatePayout are mapped properly
    }));

    return {
      data: transformedData,
      totalCount: count || 0,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching payouts.';
    console.error('getAdminAffiliatePayouts error:', errorMessage);
    return {
      data: [],
      totalCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Fetches a specific affiliate payout by ID with detailed information for the admin interface.
 * Includes associated affiliate information and payout item details if available.
 */
export async function getAdminAffiliatePayoutById(payoutId: string): Promise<{
  data: AdminAffiliatePayoutDetail | null;
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    // Step 1: Fetch the payout with basic affiliate information
    const { data: payoutData, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .select(`
        id,
        affiliate_id,
        amount,
        status,
        payout_method,
        reference,
        transaction_date,
        created_at,
        scheduled_at,
        processed_at,
        xendit_disbursement_id,
        processing_notes,
        fee_amount,
        net_amount,
        affiliates (
          id,
          user_id,
          slug,
          unified_profiles!affiliates_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', payoutId)
      .single();

    if (payoutError) {
      console.error('Error fetching payout details:', payoutError);
      return { data: null, error: payoutError.message };
    }

    if (!payoutData) {
      return { data: null, error: 'Payout not found' };
    }

    // Step 2: Fetch payout items (conversions included in this payout) if we have an items table
    const { data: payoutItems, error: itemsError } = await supabase
      .from('payout_items')
      .select(`
        id,
        payout_id,
        conversion_id,
        amount,
        affiliate_conversions (
          id,
          affiliate_id,
          order_id,
          gmv,
          commission_amount,
          status,
          created_at
        )
      `)
      .eq('payout_id', payoutId);

    if (itemsError && !itemsError.message.includes('does not exist')) {
      console.error('Error fetching payout items:', itemsError);
      // Continue anyway, just log the error
    }

    // Step 3: Get admin verification records for this payout if available
    const { data: verificationData, error: verificationError } = await supabase
      .from('admin_verifications')
      .select(`
        id, 
        admin_user_id,
        verification_type,
        is_verified,
        notes,
        verified_at,
        created_at,
        unified_profiles:admin_user_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq('target_entity_type', 'payout')
      .eq('target_entity_id', payoutId)
      .order('created_at', { ascending: false });

    if (verificationError && !verificationError.message.includes('does not exist')) {
      console.error('Error fetching verification data:', verificationError);
      // Continue anyway, just log the error
    }

    // Step 4: Format all this data into a detailed payout object
    const affilateInfo = payoutData.affiliates;
    const affiliateProfile = affilateInfo?.unified_profiles;

    const detailedPayout: AdminAffiliatePayoutDetail = {
      id: payoutData.id,
      affiliate_id: payoutData.affiliate_id,
      affiliate_name: affiliateProfile ? `${affiliateProfile.first_name || ''} ${affiliateProfile.last_name || ''}`.trim() || 'N/A' : 'N/A',
      affiliate_email: affiliateProfile?.email || 'N/A',
      affiliate_slug: affilateInfo?.slug || 'N/A',
      affiliate_avatar_url: null, // Avatar URL removed from query since it doesn't exist in schema
      
      // Base payout info
      amount: payoutData.amount,
      status: payoutData.status,
      payout_method: payoutData.payout_method,
      reference: payoutData.reference,
      transaction_date: payoutData.transaction_date,
      created_at: payoutData.created_at,
      updated_at: payoutData.created_at, // Using created_at as fallback if updated_at isn't available
      scheduled_at: payoutData.scheduled_at,
      processed_at: payoutData.processed_at,
      
      // Financial details
      fee_amount: payoutData.fee_amount,
      net_amount: payoutData.net_amount,
      
      // Required by interface
      payout_details: {},
      verification_required: false,
      
      // Processing details
      xendit_disbursement_id: payoutData.xendit_disbursement_id,
      processing_notes: payoutData.processing_notes,
      
      // Related items
      payout_items: payoutItems ? payoutItems.map(item => ({
        item_id: item.id,
        conversion_id: item.conversion_id,
        amount: item.amount,
        order_id: item.affiliate_conversions?.order_id,
        gmv: item.affiliate_conversions?.gmv,
        commission_amount: item.affiliate_conversions?.commission_amount,
        created_at: item.affiliate_conversions?.created_at,
      })) : [],
      item_count: payoutItems?.length || 0,
      
      // Verification history
      verifications: verificationData ? verificationData.map(v => ({
        verification_id: v.id,
        admin_id: v.admin_user_id,
        admin_name: v.unified_profiles ? `${v.unified_profiles.first_name || ''} ${v.unified_profiles.last_name || ''}`.trim() || 'N/A' : 'N/A',
        type: v.verification_type,
        is_verified: v.is_verified,
        notes: v.notes,
        verified_at: v.verified_at,
        created_at: v.created_at,
      })) : [],
      has_verification: verificationData && verificationData.length > 0,
    };

    return { data: detailedPayout, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred fetching payout details';
    console.error('getAdminAffiliatePayoutById error:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

/**
 * Represents a conversion that is eligible for payout with extra affiliate information.
 * Used by the payout preview system to display and process pending conversions.
 */
export interface EligiblePayoutConversion extends AffiliateConversion {
  affiliate_name: string;      // From unified_profiles.first_name + last_name
  affiliate_email: string;     // From unified_profiles.email
  affiliate_tier?: string;     // From membership_levels.name
  tier_commission_rate?: number; // From membership_levels.commission_rate
  days_pending?: number;       // Calculated: days since conversion created_at
}

/**
 * Fetches conversions ready for payout (status = 'cleared').
 * Groups by affiliate for the payout preview system.
 * @returns Promise with grouped eligible conversions and any error
 */
export async function getEligiblePayouts(): Promise<{
  affiliates: {
    affiliate_id: string;
    affiliate_name: string;
    affiliate_email: string;
    tier_commission_rate?: number;
    conversions: EligiblePayoutConversion[];
    total_amount: number;
    conversion_count: number;
  }[];
  error: string | null;
}> {
  const supabase = getAdminClient();
  
  try {
    // First, get all conversion IDs that are already assigned to payouts
    const { data: assignedConversions, error: assignedError } = await supabase
      .from('payout_items')
      .select('conversion_id');

    if (assignedError) {
      console.error('Error fetching assigned conversions:', assignedError);
      return { affiliates: [], error: assignedError.message };
    }

    const assignedConversionIds = assignedConversions?.map(item => item.conversion_id) || [];

    // Fetch cleared conversions that haven't been assigned to a payout yet
    let query = supabase
      .from('affiliate_conversions')
      .select(`
        id,
        affiliate_id,
        click_id,
        order_id,
        gmv,
        commission_amount,
        status,
        created_at,
        updated_at,
        affiliates!affiliate_conversions_affiliate_id_fkey(
          id,
          user_id,
          unified_profiles!affiliates_user_id_fkey(
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('status', 'cleared')
      .order('created_at', { ascending: false });

    // Exclude conversions that are already assigned to payouts
    if (assignedConversionIds.length > 0) {
      query = query.not('id', 'in', `(${assignedConversionIds.join(',')})`);
    }

    const { data: conversions, error } = await query;

    if (error) {
      console.error('Error fetching eligible conversions:', error);
      return { affiliates: [], error: error.message };
    }

    // Process conversions into required format
    const eligibleConversions: EligiblePayoutConversion[] = conversions.map(conversion => {
      const affiliateInfo = conversion.affiliates;
      const profile = affiliateInfo?.unified_profiles;
      
      // Calculate days pending (days since conversion created_at)
      const createdDate = new Date(conversion.created_at);
      const currentDate = new Date();
      const daysPending = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: conversion.id,
        affiliate_id: conversion.affiliate_id,
        click_id: conversion.click_id ?? '',
        order_id: conversion.order_id ?? '',
        gmv: conversion.gmv,
        commission_amount: conversion.commission_amount,
        status: conversion.status as ConversionStatusType,
        created_at: conversion.created_at,
        updated_at: conversion.updated_at ?? conversion.created_at,
        affiliate_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown',
        affiliate_email: profile?.email || 'Unknown',
        days_pending: daysPending
      };
    });

    // Group by affiliate
    const affiliateMap = new Map<string, {
      affiliate_id: string;
      affiliate_name: string;
      affiliate_email: string;
      tier_commission_rate?: number;
      conversions: EligiblePayoutConversion[];
      total_amount: number;
      conversion_count: number;
    }>();

    // Process each conversion and group by affiliate
    eligibleConversions.forEach(conversion => {
      if (!affiliateMap.has(conversion.affiliate_id)) {
        affiliateMap.set(conversion.affiliate_id, {
          affiliate_id: conversion.affiliate_id,
          affiliate_name: conversion.affiliate_name,
          affiliate_email: conversion.affiliate_email,
          conversions: [],
          total_amount: 0,
          conversion_count: 0
        });
      }

      const affiliateData = affiliateMap.get(conversion.affiliate_id)!;
      affiliateData.conversions.push(conversion);
      affiliateData.total_amount += conversion.commission_amount || 0;
      affiliateData.conversion_count += 1;
    });

    return {
      affiliates: Array.from(affiliateMap.values()),
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred fetching eligible payouts';
    console.error('getEligiblePayouts error:', errorMessage);
    return { affiliates: [], error: errorMessage };
  }
}

/**
 * Represents a preview of a payout batch with calculated totals and fees
 */
export interface PayoutBatchPreview {
  affiliates: {
    affiliate_id: string;
    affiliate_name: string;
    affiliate_email: string;
    tier_commission_rate?: number;
    total_amount: number;
    conversion_count: number;
    fee_amount: number;
    net_amount: number;
    selected?: boolean;
  }[];
  batch_totals: {
    total_payout_amount: number;
    total_fee_amount: number;
    total_net_amount: number;
    total_affiliates: number;
    total_conversions: number;
  };
}

/**
 * Calculates processing fee for a payout amount based on payout method.
 * Currently handles 'bank_transfer' with default Xendit fee structure.
 */
function calculatePayoutFee(amount: number, payoutMethod: string = 'bank_transfer'): number {
  // Default fee calculation for bank transfers via Xendit
  // 3.5% for amounts under $50, 2.5% for amounts $50+
  if (payoutMethod === 'bank_transfer') {
    if (amount < 50) {
      return parseFloat((amount * 0.035).toFixed(2)); // 3.5% fee
    } else {
      return parseFloat((amount * 0.025).toFixed(2)); // 2.5% fee
    }
  }
  
  // For other payout methods, default to 2% fee
  return parseFloat((amount * 0.02).toFixed(2));
}

/**
 * Generates a preview of a payout batch based on eligible conversions
 * Calculates fees and totals for the batch preview UI
 * @param affiliateIds Optional array of specific affiliate IDs to include
 * @param payoutMethod Method to use for fee calculation
 * @returns Preview data with calculated totals and fees
 */
export async function previewPayoutBatch({
  affiliateIds,
  payoutMethod = 'bank_transfer'
}: {
  affiliateIds?: string[];
  payoutMethod?: string;
}): Promise<{
  preview: PayoutBatchPreview | null;
  error: string | null;
}> {
  try {
    // First fetch all eligible payouts
    const { affiliates, error } = await getEligiblePayouts();
    
    if (error) {
      return { preview: null, error };
    }
    
    // Filter by affiliate IDs if provided
    let filteredAffiliates = affiliates;
    if (affiliateIds && affiliateIds.length > 0) {
      filteredAffiliates = affiliates.filter(a => 
        affiliateIds.includes(a.affiliate_id)
      );
    }
    
    // Calculate fee and net amount for each affiliate
    const affiliatesWithFees = filteredAffiliates.map(affiliate => {
      const feeAmount = calculatePayoutFee(affiliate.total_amount, payoutMethod);
      const netAmount = parseFloat((affiliate.total_amount - feeAmount).toFixed(2));
      
      return {
        ...affiliate,
        fee_amount: feeAmount,
        net_amount: netAmount,
        selected: true // Default to selected in the preview
      };
    });
    
    // Calculate batch totals
    const batchTotals = affiliatesWithFees.reduce((totals, affiliate) => {
      return {
        total_payout_amount: parseFloat((totals.total_payout_amount + affiliate.total_amount).toFixed(2)),
        total_fee_amount: parseFloat((totals.total_fee_amount + affiliate.fee_amount).toFixed(2)),
        total_net_amount: parseFloat((totals.total_net_amount + affiliate.net_amount).toFixed(2)),
        total_affiliates: totals.total_affiliates + 1,
        total_conversions: totals.total_conversions + affiliate.conversion_count
      };
    }, {
      total_payout_amount: 0,
      total_fee_amount: 0,
      total_net_amount: 0,
      total_affiliates: 0,
      total_conversions: 0
    });
    
    return {
      preview: {
        affiliates: affiliatesWithFees,
        batch_totals: batchTotals
      },
      error: null
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred generating the payout batch preview';
    console.error('previewPayoutBatch error:', errorMessage);
    return { preview: null, error: errorMessage };
  }
}

/**
 * Represents a newly created payout batch with summary information
 */
export interface CreatedPayoutBatch {
  id: string;                   // Batch ID
  name: string;                 // Batch name
  total_amount: number;         // Total amount of the batch
  fee_amount: number;           // Total fees
  net_amount: number;           // Net amount after fees
  affiliate_count: number;      // Number of affiliates
  conversion_count: number;     // Number of conversions
  payout_method: string;        // Method used for payouts
  status: string;               // Always 'pending' initially
  created_at: string;           // Creation timestamp
}

/**
 * Creates a new payout batch from a preview, creating payout records and linking conversions.
 * This is a transactional operation to ensure data integrity.
 * @param affiliateIds IDs of affiliates to include in the batch
 * @param payoutMethod The method to use for payouts
 * @param batchName Optional name for the batch
 * @returns The newly created payout batch summary
 */
export async function createPayoutBatch({
  affiliateIds,
  payoutMethod = 'bank_transfer',
  batchName
}: {
  affiliateIds: string[];
  payoutMethod?: string;
  batchName?: string;
}): Promise<{
  batch: CreatedPayoutBatch | null;
  error: string | null;
}> {
  const supabase = getAdminClient();
  const { preview, error: previewError } = await previewPayoutBatch({ affiliateIds, payoutMethod });

  if (previewError || !preview) {
    return { batch: null, error: previewError || 'Failed to generate payout preview.' };
  }

  const { affiliates, batch_totals } = preview;
  const finalBatchName = batchName || `Payout Batch ${new Date().toISOString().split('T')[0]}`;

  // This should be a transaction, but Supabase JS library doesn't directly support client-side transactions.
  // The logic is wrapped in a try/catch block to handle failures, but it's not truly atomic.
  // For true atomicity, this entire logic block should be moved into a single PostgreSQL function (RPC).
  // For now, we proceed with manual sequential operations.

  try {
    // 1. Create the payout batch record
    const { data: batchData, error: batchError } = await supabase
      .from('affiliate_payout_batches')
      .insert({
        name: finalBatchName,
        payout_method: payoutMethod,
        total_amount: batch_totals.total_payout_amount,
        fee_amount: batch_totals.total_fee_amount,
        net_amount: batch_totals.total_net_amount,
        affiliate_count: batch_totals.total_affiliates,
        conversion_count: batch_totals.total_conversions,
        status: 'pending'
      })
      .select('id, created_at')
      .single();

    if (batchError || !batchData) {
      console.error('Error creating payout batch record:', batchError);
      throw new Error(batchError?.message || 'Failed to create payout batch record.');
    }

    const batchId = batchData.id;

    // 2. Process each affiliate in the batch
    for (const affiliate of affiliates) {
      // 2a. Create the individual affiliate payout record
      const { data: payoutData, error: payoutError } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliate.affiliate_id,
          batch_id: batchId,
          amount: affiliate.total_amount,
          status: 'pending',
          payout_method: payoutMethod,
          fee_amount: affiliate.fee_amount,
          net_amount: affiliate.net_amount,
        })
        .select('id')
        .single();
      
      if (payoutError || !payoutData) {
        console.error(`Error creating payout for affiliate ${affiliate.affiliate_id}:`, payoutError);
        // In a real transaction, we would roll back here.
        continue; // Skip this affiliate and continue with others.
      }

      const payoutId = payoutData.id;
      const conversionIds = affiliate.conversions.map((c: AffiliateConversion) => c.id);

      // 2b. Create payout_items to link conversions to this payout
      const payoutItemsToInsert = conversionIds.map(conversionId => ({
        payout_id: payoutId,
        conversion_id: conversionId,
        amount: affiliate.conversions.find(c => c.id === conversionId)?.commission_amount || 0,
      }));

      const { error: itemsError } = await supabase.from('payout_items').insert(payoutItemsToInsert);
      if (itemsError) {
        console.error(`Error creating payout items for payout ${payoutId}:`, itemsError);
        continue;
      }
      
      // 2c. Update the original conversions to link them to the payout
      const { error: updateConvError } = await supabase
        .from('affiliate_conversions')
        .update({ payout_id: payoutId, status: 'processing' as ConversionStatusType })
        .in('id', conversionIds);

      if (updateConvError) {
        console.error(`Error updating conversions for payout ${payoutId}:`, updateConvError);
      }
    }
    
    // Log admin activity
    // TODO: Create a more specific 'PAYOUT_BATCH_CREATED' activity_type enum
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION', 
      description: `Created payout batch "${finalBatchName}"`,
      details: {
        batch_id: batchId,
        affiliate_count: affiliates.length,
        total_amount: batch_totals.total_payout_amount
      }
    });

    // Revalidate relevant paths
    revalidatePath('/admin/affiliates/payouts');
    revalidatePath('/admin/affiliates/payouts/batches');

    return { 
      batch: {
        id: batchId,
        name: finalBatchName,
        total_amount: batch_totals.total_payout_amount,
        fee_amount: batch_totals.total_fee_amount,
        net_amount: batch_totals.total_net_amount,
        affiliate_count: affiliates.length,
        conversion_count: batch_totals.total_conversions,
        payout_method: payoutMethod,
        status: 'pending',
        created_at: batchData.created_at,
      },
      error: null 
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during batch creation.';
    console.error('createPayoutBatch transaction error:', errorMessage);
    return { batch: null, error: errorMessage };
  }
}

/**
 * Fetches all payout batches with summary information.
 */
export async function getAdminAffiliatePayoutBatches(): Promise<{
  batches: AdminPayoutBatch[] | null;
  error: string | null;
}> {
  const supabase = getAdminClient();
  try {
    // Check if the affiliate_payout_batches table exists
    const { data, error } = await supabase
      .from('affiliate_payout_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.message?.includes('relation "public.affiliate_payout_batches" does not exist')) {
        console.warn('affiliate_payout_batches table does not exist yet. Returning empty batches.');
        return { batches: [], error: null };
      }
      throw error;
    }
    return { batches: data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred fetching payout batches.';
    console.error('getAdminAffiliatePayoutBatches error:', errorMessage);
    // Return empty array for missing table, null for other errors
    if (errorMessage.includes('relation "public.affiliate_payout_batches" does not exist')) {
      return { batches: [], error: null };
    }
    return { batches: null, error: errorMessage };
  }
}

/**
 * Deletes a payout batch, but only if it's in a 'pending' state.
 * This function should ideally also unlink associated payouts or be part of a larger transaction.
 * For now, it performs a simple delete and relies on database constraints (e.g., RLS) for security.
 * @param batchId The ID of the batch to delete.
 */
export async function deletePayoutBatch(batchId: string): Promise<{ success: boolean, error: string | null }> {
  const supabase = getAdminClient();
  try {
    // Optional: First, check if the batch is in 'pending' state
    const { data: batch, error: fetchError } = await supabase
      .from('affiliate_payout_batches')
      .select('status')
      .eq('id', batchId)
      .single();

    if (fetchError || !batch) {
      throw new Error(fetchError?.message || 'Batch not found.');
    }

    if (batch.status !== 'pending') {
      throw new Error('Only pending batches can be deleted.');
    }
    
    // Note: In a real-world scenario, you would need to handle unlinking payouts and conversions here.
    // This simplified version just deletes the batch record.

    const { error: deleteError } = await supabase
      .from('affiliate_payout_batches')
      .delete()
      .eq('id', batchId);

    if (deleteError) {
      throw deleteError;
    }

    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Deleted payout batch`,
      details: { batch_id: batchId }
    });

    revalidatePath('/admin/affiliates/payouts/batches');

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete payout batch.';
    console.error('deletePayoutBatch error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Processes a verified batch by sending payouts to Xendit for disbursement.
 * This function handles the actual payment processing workflow.
 * @param batchId The ID of the batch to process.
 */
export async function processPayoutBatch(batchId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = getAdminClient();
  try {
    // 1. Verify batch is in 'verified' status
    const { data: batch, error: fetchError } = await supabase
      .from('affiliate_payout_batches')
      .select('id, status')
      .eq('id', batchId)
      .single();

    if (fetchError || !batch) {
      throw new Error(fetchError?.message || 'Batch not found.');
    }

    if (batch.status !== 'verified') {
      throw new Error('Only verified batches can be processed.');
    }

    // 2. Update batch status to 'processing'
    const { error: updateError } = await supabase
      .from('affiliate_payout_batches')
      .update({ 
        status: 'processing' as PayoutBatchStatusType,
        processed_at: new Date().toISOString()
      })
      .eq('id', batchId);

    if (updateError) {
      throw updateError;
    }

    // 3. Get all payouts in this batch
    const { data: payouts, error: payoutsError } = await supabase
      .from('affiliate_payouts')
      .select('id')
      .eq('batch_id', batchId)
      .eq('status', 'pending');

    if (payoutsError) {
      throw payoutsError;
    }

    if (!payouts || payouts.length === 0) {
      throw new Error('No pending payouts found in this batch.');
    }

    // 4. Process payouts via Xendit
    const payoutIds = payouts.map(p => p.id);
    const { successes, failures, error: xenditError } = await processPayoutsViaXendit({
      payoutIds,
      adminUserId: 'system' // TODO: Get actual admin user ID
    });

    // 5. Log the results
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Processed payout batch`,
      details: { 
        batch_id: batchId,
        successes: successes.length,
        failures: failures.length,
        xendit_error: xenditError
      }
    });

    // 6. Update batch status based on results
    let finalStatus: PayoutBatchStatusType = 'completed';
    if (failures.length > 0) {
      finalStatus = failures.length === payoutIds.length ? 'failed' : 'processing';
    }

    await supabase
      .from('affiliate_payout_batches')
      .update({ status: finalStatus })
      .eq('id', batchId);

    revalidatePath('/admin/affiliates/payouts/batches');
    revalidatePath(`/admin/affiliates/payouts/batches/${batchId}`);

    return { 
      success: true, 
      error: failures.length > 0 ? `${failures.length} payouts failed` : null 
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to process payout batch.';
    console.error('processPayoutBatch error:', errorMessage);
    
    // Revert batch status to verified on error
    try {
      await supabase
        .from('affiliate_payout_batches')
        .update({ status: 'verified' as PayoutBatchStatusType })
        .eq('id', batchId);
    } catch (revertError) {
      console.error('Failed to revert batch status:', revertError);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Fetches aggregate statistics about payout batches.
 */
export async function getAdminAffiliatePayoutBatchStats(): Promise<{
  stats: PayoutBatchStats | null;
  error: string | null;
}> {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase.rpc('get_payout_batch_stats');
    
    if (error) {
      // If RPC function doesn't exist, return default stats
      if (error.message?.includes('function get_payout_batch_stats() does not exist')) {
        console.warn('get_payout_batch_stats RPC function does not exist yet. Returning default stats.');
        return { 
          stats: {
            totalBatches: 0,
            pendingBatches: 0,
            processingBatches: 0,
            completedBatches: 0,
            totalAmount: 0
          }, 
          error: null 
        };
      }
      throw error;
    }

    // The RPC function is expected to return a single row with the stats.
    // If it returns an array, we take the first element.
    const statsData = Array.isArray(data) ? data[0] : data;

    return { stats: statsData, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payout batch stats.';
    console.error('getAdminAffiliatePayoutBatchStats error:', errorMessage);
    // Return default stats for missing function, null for other errors
    if (errorMessage.includes('function get_payout_batch_stats() does not exist')) {
      return { 
        stats: {
          totalBatches: 0,
          pendingBatches: 0,
          processingBatches: 0,
          completedBatches: 0,
          totalAmount: 0
        }, 
        error: null 
      };
    }
    return { stats: null, error: errorMessage };
  }
}

/**
 * Marks a payout batch as verified by an admin.
 * This adds admin verification records and updates batch status.
 */
export async function verifyPayoutBatch({
  batchId,
  verificationNotes
}: {
  batchId: string;
  verificationNotes?: string;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = getAdminClient();
  
  try {
    // 1. Fetch the batch to ensure it exists and is in the correct state
    const { data: batch, error: fetchError } = await supabase
      .from('affiliate_payout_batches')
      .select('id, status')
      .eq('id', batchId)
      .single();

    if (fetchError || !batch) {
      throw new Error(fetchError?.message || 'Batch not found.');
    }

    if (batch.status !== 'pending') {
      throw new Error('Only pending batches can be verified.');
    }

    // 2. Create admin verification record
    const { error: verificationError } = await supabase
      .from('admin_verifications')
      .insert([{
        target_entity_type: 'payout_batch',
        target_entity_id: batchId,
        verification_type: 'batch_verification',
        is_verified: true,
        notes: verificationNotes || null,
        verified_at: new Date().toISOString(),
      }]);

    if (verificationError) {
      throw verificationError;
    }

    // 3. Update batch status to 'verified'
    const { error: updateError } = await supabase
      .from('affiliate_payout_batches')
      .update({ status: 'verified' as PayoutBatchStatusType })
      .eq('id', batchId);

    if (updateError) {
      throw updateError;
    }

    // 4. Log admin activity
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Verified payout batch`,
      details: { 
        batch_id: batchId,
        verification_notes: verificationNotes 
      }
    });

    // 5. Revalidate relevant paths
    revalidatePath('/admin/affiliates/payouts/batches');
    revalidatePath(`/admin/affiliates/payouts/batches/${batchId}`);

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to verify payout batch.';
    console.error('verifyPayoutBatch error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Retrieves historical payout records with filtering options.
 * Useful for generating reports and analyzing payout trends.
 */
export async function getPayoutHistory({
  filters = {},
  pagination = { page: 1, pageSize: 50 },
  sort = { sortBy: 'created_at', sortDirection: 'desc' },
}: {
  filters?: {
    status?: PayoutStatusType;
    affiliateId?: string;
    batchId?: string;
    dateFrom?: string;
    dateTo?: string;
    payoutMethod?: string;
  };
  pagination?: {
    page?: number;
    pageSize?: number;
  };
  sort?: {
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  };
}): Promise<{
  data: AdminAffiliatePayout[];
  totalCount: number;
  totalAmount: number;
  error: string | null;
}> {
  const supabase = getAdminClient();
  const { page = 1, pageSize = 50 } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    // First get the payout data with basic info
    let query = supabase
      .from('affiliate_payouts')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.affiliateId) {
      query = query.eq('affiliate_id', filters.affiliateId);
    }
    if (filters.batchId) {
      query = query.eq('batch_id', filters.batchId);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters.payoutMethod) {
      query = query.eq('payout_method', filters.payoutMethod);
    }

    // Apply sorting
    if (sort.sortBy && sort.sortDirection) {
      query = query.order(sort.sortBy, { ascending: sort.sortDirection === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data: rawPayouts, error, count } = await query;

    if (error) {
      throw error;
    }

    if (!rawPayouts || rawPayouts.length === 0) {
      return {
        data: [],
        totalCount: count || 0,
        totalAmount: 0,
        error: null,
      };
    }

    // Get unique affiliate IDs to fetch affiliate information
    const affiliateIds = [...new Set(rawPayouts.map(p => p.affiliate_id))];
    
    // Fetch affiliates and profiles separately and join manually
    const { data: affiliatesOnly, error: affiliatesOnlyError } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .in('id', affiliateIds);

    // Create a map for quick affiliate lookup
    const affiliateMap = new Map();
    
    if (!affiliatesOnlyError && affiliatesOnly && affiliatesOnly.length > 0) {
      const userIds = affiliatesOnly.map(a => a.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('unified_profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (!profilesError && profiles) {
        affiliatesOnly.forEach(affiliate => {
          const profile = profiles.find(p => p.id === affiliate.user_id);
          affiliateMap.set(affiliate.id, {
            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A' : 'N/A',
            email: profile?.email || 'N/A'
          });
        });
      }
    }

    // Transform data to match AdminAffiliatePayout interface
    const transformedData: AdminAffiliatePayout[] = rawPayouts.map((p: any) => {
      const affiliateInfo = affiliateMap.get(p.affiliate_id) || { name: 'N/A', email: 'N/A' };
      
      return {
        payout_id: p.id,
        affiliate_id: p.affiliate_id,
        affiliate_name: affiliateInfo.name,
        affiliate_email: affiliateInfo.email,
        amount: p.amount,
        status: p.status as PayoutStatusType,
        payout_method: p.payout_method || 'bank_transfer',
        reference: p.reference,
        transaction_date: p.transaction_date,
        created_at: p.created_at,
        processed_at: p.processed_at,
        xendit_disbursement_id: p.xendit_disbursement_id,
        processing_notes: p.processing_notes,
        fee_amount: p.fee_amount,
        net_amount: p.net_amount,
        batch_id: p.batch_id,
      };
    });

    // Calculate total amount for the filtered results
    const totalAmount = transformedData.reduce((sum, payout) => sum + (payout.amount || 0), 0);

    return {
      data: transformedData,
      totalCount: count || 0,
      totalAmount,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching payout history.';
    console.error('getPayoutHistory error:', errorMessage);
    return {
      data: [],
      totalCount: 0,
      totalAmount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Generates downloadable report files for payout data.
 * Supports multiple export formats and filtering options.
 */
export async function exportPayoutData({
  format = 'csv',
  filters = {},
  includeDetails = true,
}: {
  format?: 'csv' | 'json';
  filters?: {
    status?: PayoutStatusType;
    affiliateId?: string;
    batchId?: string;
    dateFrom?: string;
    dateTo?: string;
    payoutMethod?: string;
  };
  includeDetails?: boolean;
}): Promise<{
  data: string | null;
  filename: string;
  contentType: string;
  error: string | null;
}> {
  try {
    // Fetch all matching payout records (no pagination for export)
    const { data: payouts, error } = await getPayoutHistory({
      filters,
      pagination: { page: 1, pageSize: 10000 }, // Large page size for export
      sort: { sortBy: 'created_at', sortDirection: 'desc' },
    });

    if (error) {
      throw new Error(error);
    }

    if (!payouts || payouts.length === 0) {
      throw new Error('No payout data found for the specified filters.');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    let filename: string;
    let contentType: string;
    let exportData: string;

    if (format === 'csv') {
      filename = `payout-export-${timestamp}.csv`;
      contentType = 'text/csv';
      
      // Create CSV headers
      const headers = [
        'Payout ID',
        'Affiliate ID', 
        'Affiliate Name',
        'Affiliate Email',
        'Amount',
        'Status',
        'Payout Method',
        'Reference',
        'Transaction Date',
        'Created At',
        'Processed At',
        'Xendit Disbursement ID',
        'Processing Notes',
        'Fee Amount',
        'Net Amount',
        'Batch ID'
      ];

      // Convert data to CSV format
      const csvRows = [
        headers.join(','),
        ...payouts.map(payout => [
          payout.payout_id,
          payout.affiliate_id,
          `"${payout.affiliate_name}"`,
          `"${payout.affiliate_email}"`,
          payout.amount,
          payout.status,
          payout.payout_method,
          payout.reference || '',
          payout.transaction_date || '',
          payout.created_at,
          payout.processed_at || '',
          payout.xendit_disbursement_id || '',
          `"${payout.processing_notes || ''}"`,
          payout.fee_amount || '',
          payout.net_amount || '',
          payout.batch_id || ''
        ].join(','))
      ];

      exportData = csvRows.join('\n');
    } else {
      // JSON format
      filename = `payout-export-${timestamp}.json`;
      contentType = 'application/json';
      
      const exportObject = {
        export_metadata: {
          generated_at: new Date().toISOString(),
          total_records: payouts.length,
          filters_applied: filters,
          format: 'json'
        },
        payouts: includeDetails ? payouts : payouts.map(p => ({
          payout_id: p.payout_id,
          affiliate_id: p.affiliate_id,
          affiliate_name: p.affiliate_name,
          amount: p.amount,
          status: p.status,
          created_at: p.created_at
        }))
      };

      exportData = JSON.stringify(exportObject, null, 2);
    }

    // Log admin activity
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Exported payout data`,
      details: { 
        format,
        filters,
        record_count: payouts.length,
        filename
      }
    });

    return {
      data: exportData,
      filename,
      contentType,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to export payout data.';
    console.error('exportPayoutData error:', errorMessage);
    return {
      data: null,
      filename: '',
      contentType: '',
      error: errorMessage,
    };
  }
}

/**
 * Process payouts via Xendit disbursement API
 * This function takes verified payouts and sends them to Xendit for actual disbursement
 */
export async function processPayoutsViaXendit({
  payoutIds,
  adminUserId,
}: {
  payoutIds: string[];
  adminUserId: string;
}): Promise<{
  successes: Array<{ payoutId: string; xenditId: string; externalId: string }>;
  failures: Array<{ payoutId: string; error: string }>;
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    // Fetch payout details with affiliate bank information
    const { data: payouts, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .select(`
        id,
        affiliate_id,
        amount,
        status,
        reference,
        payout_method,
        fee_amount,
        net_amount,
        affiliates (
          id,
          bank_code,
          bank_account_number,
          bank_account_name,
          unified_profiles!affiliates_user_id_fkey (
            email,
            first_name,
            last_name
          )
        )
      `)
      .in('id', payoutIds)
      .eq('status', 'pending');

    if (payoutError) {
      console.error('Error fetching payouts for Xendit processing:', payoutError);
      return {
        successes: [],
        failures: [],
        error: payoutError.message,
      };
    }

    if (!payouts || payouts.length === 0) {
      return {
        successes: [],
        failures: [],
        error: 'No valid pending payouts found for processing',
      };
    }

    const successes: Array<{ payoutId: string; xenditId: string; externalId: string }> = [];
    const failures: Array<{ payoutId: string; error: string }> = [];

    // Process each payout through Xendit
    for (const payout of payouts) {
      try {
        // Validate required bank information
        if (!payout.affiliates?.bank_code || 
            !payout.affiliates?.bank_account_number || 
            !payout.affiliates?.bank_account_name) {
          failures.push({
            payoutId: payout.id,
            error: 'Missing required bank information for affiliate',
          });
          continue;
        }

        // Generate unique reference ID if not already set
        const externalId = payout.reference || XenditUtils.generateReferenceId('payout');

        // Create Xendit payout request (v2 API)
        const payoutRequest = xenditDisbursementService.formatPayoutForXendit({
          id: payout.id,
          affiliate_id: payout.affiliate_id,
          amount: payout.net_amount || payout.amount, // Use net amount after fees
          channel_code: payout.affiliates.bank_code, // This should be PH_* format
          account_number: payout.affiliates.bank_account_number,
          account_holder_name: payout.affiliates.bank_account_name,
          reference: externalId,
          description: `Affiliate commission payout for ${payout.affiliates.unified_profiles?.first_name || ''} ${payout.affiliates.unified_profiles?.last_name || ''}`.trim(),
          affiliate_email: payout.affiliates.unified_profiles?.email,
        });

        // Send to Xendit using v2 Payouts API
        const { data: xenditResponse, error: xenditError } = await xenditDisbursementService.createPayout(payoutRequest);

        if (xenditError || !xenditResponse) {
          failures.push({
            payoutId: payout.id,
            error: xenditError?.message || 'Xendit disbursement creation failed',
          });
          continue;
        }

        // Update payout status and Xendit reference
        const { error: updateError } = await supabase
          .from('affiliate_payouts')
          .update({
            status: 'processing',
            xendit_disbursement_id: xenditResponse.id,
            reference: externalId,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        if (updateError) {
          console.error('Error updating payout status after Xendit success:', updateError);
          failures.push({
            payoutId: payout.id,
            error: `Xendit disbursement created but database update failed: ${updateError.message}`,
          });
          continue;
        }

        // Log admin activity
        await logAdminActivity({
          admin_user_id: adminUserId,
          action: 'payout_sent_to_xendit',
          target_type: 'payout',
          target_id: payout.id,
          details: {
            xendit_disbursement_id: xenditResponse.id,
            external_id: externalId,
            amount: payout.amount,
            net_amount: payout.net_amount,
            affiliate_id: payout.affiliate_id,
            bank_code: payout.affiliates.bank_code,
          },
        });

        successes.push({
          payoutId: payout.id,
          xenditId: xenditResponse.id,
          externalId: externalId,
        });

      } catch (error) {
        console.error(`Error processing payout ${payout.id} via Xendit:`, error);
        failures.push({
          payoutId: payout.id,
          error: error instanceof Error ? error.message : 'Unknown error during Xendit processing',
        });
      }
    }

    // Revalidate admin pages
    revalidatePath('/admin/affiliates/payouts');
    revalidatePath('/admin/affiliates/payouts/batches');

    return {
      successes,
      failures,
      error: null,
    };

  } catch (error) {
    console.error('Error in processPayoutsViaXendit:', error);
    return {
      successes: [],
      failures: [],
      error: error instanceof Error ? error.message : 'Failed to process payouts via Xendit',
    };
  }
}

/**
 * Retry failed Xendit disbursements
 * This function retries payouts that previously failed in Xendit
 */
export async function retryFailedXenditPayouts({
  payoutIds,
  adminUserId,
}: {
  payoutIds: string[];
  adminUserId: string;
}): Promise<{
  successes: Array<{ payoutId: string; xenditId: string }>;
  failures: Array<{ payoutId: string; error: string }>;
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    // Reset failed payouts to pending status first
    const { error: resetError } = await supabase
      .from('affiliate_payouts')
      .update({
        status: 'pending',
        xendit_disbursement_id: null,
        failed_at: null,
        failure_reason: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', payoutIds)
      .eq('status', 'failed');

    if (resetError) {
      return {
        successes: [],
        failures: [],
        error: `Failed to reset payout statuses: ${resetError.message}`,
      };
    }

    // Now process them via Xendit using the main function
    const result = await processPayoutsViaXendit({
      payoutIds,
      adminUserId,
    });

    return {
      successes: result.successes.map(s => ({ payoutId: s.payoutId, xenditId: s.xenditId })),
      failures: result.failures,
      error: result.error,
    };

  } catch (error) {
    console.error('Error in retryFailedXenditPayouts:', error);
    return {
      successes: [],
      failures: [],
      error: error instanceof Error ? error.message : 'Failed to retry failed payouts',
    };
  }
}

/**
 * Check Xendit disbursement status and update payout records
 * This function can be used to manually sync status from Xendit
 */
export async function syncXenditPayoutStatus({
  payoutIds,
  adminUserId,
}: {
  payoutIds: string[];
  adminUserId: string;
}): Promise<{
  updated: Array<{ payoutId: string; oldStatus: string; newStatus: string }>;
  errors: Array<{ payoutId: string; error: string }>;
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    // Fetch payouts with Xendit disbursement IDs
    const { data: payouts, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .select('id, status, xendit_disbursement_id')
      .in('id', payoutIds)
      .not('xendit_disbursement_id', 'is', null);

    if (payoutError) {
      return {
        updated: [],
        errors: [],
        error: payoutError.message,
      };
    }

    if (!payouts || payouts.length === 0) {
      return {
        updated: [],
        errors: [],
        error: 'No payouts found with Xendit disbursement IDs',
      };
    }

    const updated: Array<{ payoutId: string; oldStatus: string; newStatus: string }> = [];
    const errors: Array<{ payoutId: string; error: string }> = [];

    // Check status for each payout
    for (const payout of payouts) {
      try {
        if (!payout.xendit_disbursement_id) {
          errors.push({
            payoutId: payout.id,
            error: 'No Xendit disbursement ID found',
          });
          continue;
        }

        // Get current status from Xendit using v2 API
        const { data: xenditResponse, error: xenditError } = await xenditDisbursementService.getPayout(payout.xendit_disbursement_id);

        if (xenditError || !xenditResponse) {
          errors.push({
            payoutId: payout.id,
            error: xenditError?.message || 'Failed to fetch from Xendit',
          });
          continue;
        }

        // Map Xendit status to our internal status
        const newStatus = XenditUtils.mapStatusToInternal(xenditResponse.status);
        
        // Only update if status has changed
        if (payout.status !== newStatus) {
          const updateData: any = {
            status: newStatus,
            updated_at: new Date().toISOString(),
          };

          // Set appropriate timestamps based on status
          if (xenditResponse.status === 'COMPLETED') {
            updateData.processed_at = new Date().toISOString();
          } else if (xenditResponse.status === 'FAILED') {
            updateData.failed_at = new Date().toISOString();
            updateData.failure_reason = xenditResponse.failure_code || 'Unknown failure';
          }

          const { error: updateError } = await supabase
            .from('affiliate_payouts')
            .update(updateData)
            .eq('id', payout.id);

          if (updateError) {
            errors.push({
              payoutId: payout.id,
              error: `Database update failed: ${updateError.message}`,
            });
            continue;
          }

          // Log the sync activity
          await logAdminActivity({
            admin_user_id: adminUserId,
            action: 'payout_status_synced',
            target_type: 'payout',
            target_id: payout.id,
            details: {
              previous_status: payout.status,
              new_status: newStatus,
              xendit_status: xenditResponse.status,
              xendit_disbursement_id: payout.xendit_disbursement_id,
            },
          });

          updated.push({
            payoutId: payout.id,
            oldStatus: payout.status,
            newStatus,
          });
        }

      } catch (error) {
        console.error(`Error syncing payout ${payout.id}:`, error);
        errors.push({
          payoutId: payout.id,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        });
      }
    }

    // Revalidate admin pages if any updates were made
    if (updated.length > 0) {
      revalidatePath('/admin/affiliates/payouts');
      revalidatePath('/admin/affiliates/payouts/batches');
    }

    return {
      updated,
      errors,
      error: null,
    };

  } catch (error) {
    console.error('Error in syncXenditPayoutStatus:', error);
    return {
      updated: [],
      errors: [],
      error: error instanceof Error ? error.message : 'Failed to sync payout statuses',
    };
  }
} 