import { createServiceRoleClient } from '@/lib/supabase/server';

// Industry standard batch automation configuration
const BATCH_CONFIG = {
  DAYS_BEFORE_MONTH_END: 5, // Create batches 5 days before month-end
  MIN_CLEARED_CONVERSIONS: 1, // Minimum conversions needed to create batch
  BATCH_NOTIFICATION_DAYS: [5, 3, 1], // Send notifications on these days before month-end
  AUTO_APPROVE_THRESHOLD: 10000, // PHP - require manual approval for batches over this amount
} as const;

export interface BatchCreationResult {
  success: boolean;
  batchId?: string;
  totalAmount?: number;
  conversionCount?: number;
  requiresApproval?: boolean;
  error?: string;
  message?: string;
}

export interface BatchNotificationResult {
  success: boolean;
  emailsSent?: number;
  notificationType?: 'creation' | 'reminder' | 'approval_required';
  error?: string;
}

/**
 * Calculate days until month end
 */
function getDaysUntilMonthEnd(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Get last day of current month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  
  return lastDayOfMonth - currentDay;
}

/**
 * Check if today is a batch creation day (5 days before month-end)
 */
export function shouldCreateBatch(): boolean {
  const daysUntilMonthEnd = getDaysUntilMonthEnd();
  return daysUntilMonthEnd === BATCH_CONFIG.DAYS_BEFORE_MONTH_END;
}

/**
 * Get eligible conversions for batch creation (cleared status, not yet in a batch)
 */
export async function getEligibleConversions() {
  const supabase = await createServiceRoleClient();
  
  const { data: conversions, error } = await supabase
    .from('affiliate_conversions')
    .select(`
      id,
      affiliate_id,
      commission_amount,
      gmv,
      cleared_at,
      affiliates!inner (
        id,
        user_id,
        payout_method,
        bank_name,
        account_number,
        account_holder_name,
        unified_profiles!inner (
          email,
          full_name
        )
      )
    `)
    .eq('status', 'cleared')
    .is('paid_at', null); // Not yet paid
    
  if (error) {
    console.error('Error fetching eligible conversions:', error);
    return { conversions: [], error: error.message };
  }
  
  return { conversions: conversions || [], error: null };
}

/**
 * Create monthly payout batch automatically
 */
export async function createMonthlyBatch(): Promise<BatchCreationResult> {
  try {
    const supabase = await createServiceRoleClient();
    
    // Get eligible conversions
    const { conversions, error: eligibilityError } = await getEligibleConversions();
    
    if (eligibilityError) {
      return { success: false, error: eligibilityError };
    }
    
    if (!conversions || conversions.length < BATCH_CONFIG.MIN_CLEARED_CONVERSIONS) {
      return {
        success: false,
        error: `Insufficient cleared conversions (${conversions?.length || 0}). Minimum required: ${BATCH_CONFIG.MIN_CLEARED_CONVERSIONS}`
      };
    }
    
    // Calculate total amount
    const totalAmount = conversions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
    
    // Determine if manual approval is required
    const requiresApproval = totalAmount > BATCH_CONFIG.AUTO_APPROVE_THRESHOLD;
    
    // Create batch description
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    const batchName = `${monthName} ${year} Automated Payout Batch`;
    
    // Create the batch record
    const { data: batch, error: batchError } = await supabase
      .from('affiliate_payout_batches')
      .insert({
        name: batchName,
        description: `Automatically created batch for ${monthName} ${year} payouts. Contains ${conversions.length} cleared conversions totaling ₱${totalAmount.toLocaleString()}.`,
        status: requiresApproval ? 'pending' : 'verified', // Auto-verify small batches
        total_amount: totalAmount,
        total_conversions: conversions.length,
        created_by: '00000000-0000-0000-0000-000000000000', // System user UUID
        auto_created: true,
        verification_notes: requiresApproval 
          ? `Manual approval required - batch amount ₱${totalAmount.toLocaleString()} exceeds auto-approval threshold`
          : `Auto-verified - batch amount ₱${totalAmount.toLocaleString()} is within auto-approval threshold`,
      })
      .select('id, name, total_amount, status')
      .single();
      
    if (batchError) {
      console.error('Error creating batch:', batchError);
      return { success: false, error: `Failed to create batch: ${batchError.message}` };
    }
    
    // Create individual payout records for each conversion
    const payoutRecords = conversions.map(conversion => ({
      batch_id: batch.id,
      affiliate_id: conversion.affiliate_id,
      conversion_id: conversion.id,
      amount: conversion.commission_amount,
      payout_method: conversion.affiliates.payout_method || 'bank_transfer',
      bank_name: conversion.affiliates.bank_name,
      account_number: conversion.affiliates.account_number,
      account_holder_name: conversion.affiliates.account_holder_name,
      recipient_email: conversion.affiliates.unified_profiles.email,
      recipient_name: conversion.affiliates.unified_profiles.full_name,
      status: 'pending'
    }));
    
    const { error: payoutsError } = await supabase
      .from('affiliate_payouts')
      .insert(payoutRecords);
      
    if (payoutsError) {
      console.error('Error creating payout records:', payoutsError);
      // Try to rollback the batch creation
      await supabase.from('affiliate_payout_batches').delete().eq('id', batch.id);
      return { success: false, error: `Failed to create payout records: ${payoutsError.message}` };
    }
    
    return {
      success: true,
      batchId: batch.id,
      totalAmount,
      conversionCount: conversions.length,
      requiresApproval,
      message: `Successfully created ${requiresApproval ? 'pending approval' : 'auto-verified'} batch "${batch.name}" with ${conversions.length} payouts totaling ₱${totalAmount.toLocaleString()}`
    };
    
  } catch (error) {
    console.error('Unexpected error in createMonthlyBatch:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Main automation function to be called by cron job
 * Handles both batch creation and notifications
 */
export async function runBatchAutomation(): Promise<{
  batchCreation?: BatchCreationResult;
  summary: string;
}> {
  const results: {
    batchCreation?: BatchCreationResult;
    summary: string;
  } = { summary: '' };
  
  const shouldCreate = shouldCreateBatch();
  const daysUntilMonthEnd = getDaysUntilMonthEnd();
  
  console.log(`Batch Automation Check - Days until month-end: ${daysUntilMonthEnd}`);
  
  // Handle batch creation
  if (shouldCreate) {
    console.log('🎯 Creating monthly batch (5 days before month-end)');
    results.batchCreation = await createMonthlyBatch();
    
    if (results.batchCreation.success) {
      results.summary = `✅ Batch created: ${results.batchCreation.conversionCount} payouts, ₱${results.batchCreation.totalAmount?.toLocaleString()}`;
    } else {
      results.summary = `❌ Batch creation failed: ${results.batchCreation.error}`;
    }
  } else {
    results.summary = `⏸️ No action needed (${daysUntilMonthEnd} days until month-end, trigger at ${BATCH_CONFIG.DAYS_BEFORE_MONTH_END} days)`;
  }
  
  return results;
}

/**
 * Manual override function for testing and emergency batch creation
 */
export async function createBatchNow(force: boolean = false): Promise<BatchCreationResult> {
  if (!force) {
    const daysUntilMonthEnd = getDaysUntilMonthEnd();
    if (daysUntilMonthEnd > BATCH_CONFIG.DAYS_BEFORE_MONTH_END) {
      return {
        success: false,
        error: `Manual batch creation not recommended. ${daysUntilMonthEnd} days until month-end (normal creation at ${BATCH_CONFIG.DAYS_BEFORE_MONTH_END} days). Use force=true to override.`
      };
    }
  }
  
  console.log('🚨 Manual batch creation triggered');
  return await createMonthlyBatch();
} 