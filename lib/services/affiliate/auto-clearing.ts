import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Automated clearing service for affiliate conversions
 * Handles the transition from 'pending' to 'cleared' after refund period
 */

export interface AutoClearingConfig {
  refund_period_days: number;
  auto_clear_enabled: boolean;
  fraud_check_enabled: boolean;
  min_days_before_clear: number;
  max_days_before_clear: number;
}

export interface ClearingResult {
  total_processed: number;
  cleared_count: number;
  flagged_count: number;
  errors: string[];
  cleared_conversions: Array<{
    id: string;
    affiliate_id: string;
    commission_amount: number;
    days_pending: number;
  }>;
}

/**
 * Get auto-clearing configuration from admin settings
 */
export async function getAutoClearingConfig(): Promise<AutoClearingConfig> {
  const supabase = getAdminClient();
  
  try {
    const { data: config } = await supabase
      .from('affiliate_program_config')
      .select('*')
      .eq('id', 1)
      .single();
    
    return {
      refund_period_days: Number(config?.refund_period_days) || 30,
      auto_clear_enabled: Boolean(config?.auto_clear_enabled) ?? true,
      fraud_check_enabled: Boolean(config?.fraud_check_enabled) ?? true,
      min_days_before_clear: Number(config?.min_days_before_clear) || 7,
      max_days_before_clear: Number(config?.max_days_before_clear) || 45
    };
  } catch (error) {
    console.error('Error fetching auto-clearing config:', error);
    // Return safe defaults
    return {
      refund_period_days: 30,
      auto_clear_enabled: true,
      fraud_check_enabled: true,
      min_days_before_clear: 7,
      max_days_before_clear: 45
    };
  }
}

/**
 * Run automated clearing process for eligible conversions
 */
export async function runAutoClearingProcess(): Promise<ClearingResult> {
  const supabase = getAdminClient();
  const config = await getAutoClearingConfig();
  
  const result: ClearingResult = {
    total_processed: 0,
    cleared_count: 0,
    flagged_count: 0,
    errors: [],
    cleared_conversions: []
  };
  
  if (!config.auto_clear_enabled) {
    result.errors.push('Auto-clearing is disabled in configuration');
    return result;
  }
  
  try {
    // Calculate date thresholds
    const now = new Date();
    const minClearDate = new Date(now.getTime() - (config.min_days_before_clear * 24 * 60 * 60 * 1000));
    const maxClearDate = new Date(now.getTime() - (config.max_days_before_clear * 24 * 60 * 60 * 1000));
    const refundCutoffDate = new Date(now.getTime() - (config.refund_period_days * 24 * 60 * 60 * 1000));
    
    console.log('Auto-clearing date thresholds:', {
      refund_cutoff: refundCutoffDate.toISOString(),
      min_clear: minClearDate.toISOString(),
      max_clear: maxClearDate.toISOString()
    });
    
    // Get pending conversions eligible for clearing
    const { data: pendingConversions, error: fetchError } = await supabase
      .from('affiliate_conversions')
      .select(`
        id,
        affiliate_id,
        commission_amount,
        created_at,
        order_id,
        customer_id,
        gmv,
        affiliates!inner (
          id,
          user_id,
          unified_profiles!inner (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('status', 'pending')
      .lte('created_at', refundCutoffDate.toISOString())
      .gte('created_at', maxClearDate.toISOString()); // Don't process very old conversions
    
    if (fetchError) {
      result.errors.push(`Error fetching pending conversions: ${fetchError.message}`);
      return result;
    }
    
    if (!pendingConversions || pendingConversions.length === 0) {
      console.log('No pending conversions found for auto-clearing');
      return result;
    }
    
    result.total_processed = pendingConversions.length;
    console.log(`Processing ${result.total_processed} pending conversions for auto-clearing`);
    
    // Process each conversion
    for (const conversion of pendingConversions) {
      try {
        const daysPending = Math.floor(
          (now.getTime() - new Date(conversion.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Determine if conversion should be cleared or flagged
        let newStatus: 'cleared' | 'flagged' = 'cleared';
        let clearingReason = `Auto-cleared after ${daysPending} days (refund period expired)`;
        
        // Run fraud checks if enabled
        if (config.fraud_check_enabled) {
          const fraudCheck = await runFraudCheck(conversion);
          if (fraudCheck.isSuspicious) {
            newStatus = 'flagged';
            clearingReason = `Auto-flagged: ${fraudCheck.reason}`;
          }
        }
        
        // Update conversion status
        const { error: updateError } = await supabase
          .from('affiliate_conversions')
          .update({
            status: newStatus,
            updated_at: now.toISOString(),
            cleared_at: newStatus === 'cleared' ? now.toISOString() : null,
            clearing_reason: clearingReason,
            auto_cleared: true
          })
          .eq('id', conversion.id);
        
        if (updateError) {
          result.errors.push(`Error updating conversion ${conversion.id}: ${updateError.message}`);
          continue;
        }
        
        // Create audit record
        await createClearingAuditRecord({
          conversion_id: conversion.id,
          affiliate_id: conversion.affiliate_id,
          old_status: 'pending',
          new_status: newStatus,
          days_pending: daysPending,
          clearing_reason: clearingReason,
          auto_processed: true
        });
        
        if (newStatus === 'cleared') {
          result.cleared_count++;
          result.cleared_conversions.push({
            id: conversion.id,
            affiliate_id: conversion.affiliate_id,
            commission_amount: Number(conversion.commission_amount),
            days_pending: daysPending
          });
        } else {
          result.flagged_count++;
        }
        
        console.log(`Conversion ${conversion.id} auto-${newStatus} after ${daysPending} days`);
        
      } catch (conversionError) {
        const errorMsg = `Error processing conversion ${conversion.id}: ${conversionError}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    // Log summary
    console.log('Auto-clearing process completed:', {
      total_processed: result.total_processed,
      cleared: result.cleared_count,
      flagged: result.flagged_count,
      errors: result.errors.length
    });
    
    return result;
    
  } catch (error) {
    const errorMsg = `Auto-clearing process failed: ${error}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
    return result;
  }
}

/**
 * Basic fraud detection for auto-clearing
 */
async function runFraudCheck(conversion: any): Promise<{ isSuspicious: boolean; reason?: string }> {
  const supabase = getAdminClient();
  
  try {
    // Check for multiple conversions from same customer/order
    if (conversion.customer_id || conversion.order_id) {
      const { data: duplicates } = await supabase
        .from('affiliate_conversions')
        .select('id, affiliate_id')
        .or(`customer_id.eq.${conversion.customer_id},order_id.eq.${conversion.order_id}`)
        .neq('id', conversion.id);
      
      if (duplicates && duplicates.length > 0) {
        return {
          isSuspicious: true,
          reason: 'Duplicate customer/order detected'
        };
      }
    }
    
    // Check for unusually high commission amounts
    const commissionAmount = Number(conversion.commission_amount);
    if (commissionAmount > 1000) { // Configurable threshold
      return {
        isSuspicious: true,
        reason: `High commission amount: ₱${commissionAmount}`
      };
    }
    
    // Check affiliate's recent conversion patterns
    const { data: recentConversions } = await supabase
      .from('affiliate_conversions')
      .select('id, created_at, commission_amount')
      .eq('affiliate_id', conversion.affiliate_id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .neq('id', conversion.id);
    
    if (recentConversions && recentConversions.length > 10) { // More than 10 conversions in 7 days
      return {
        isSuspicious: true,
        reason: 'Unusual conversion frequency detected'
      };
    }
    
    return { isSuspicious: false };
    
  } catch (error) {
    console.error('Fraud check error:', error);
    // If fraud check fails, err on the side of caution
    return {
      isSuspicious: true,
      reason: 'Fraud check system error'
    };
  }
}

/**
 * Create audit record for clearing actions
 */
async function createClearingAuditRecord(params: {
  conversion_id: string;
  affiliate_id: string;
  old_status: string;
  new_status: string;
  days_pending: number;
  clearing_reason: string;
  auto_processed: boolean;
}) {
  const supabase = getAdminClient();
  
  try {
    await supabase
      .from('admin_verifications')
      .insert({
        admin_user_id: '00000000-0000-0000-0000-000000000000', // System user ID
        target_entity_type: 'conversion',
        target_entity_id: params.conversion_id,
        verification_type: 'auto_clearing',
        is_verified: params.new_status === 'cleared',
        notes: `${params.clearing_reason} (${params.days_pending} days pending)`,
        verified_at: new Date().toISOString(),
        metadata: {
          affiliate_id: params.affiliate_id,
          old_status: params.old_status,
          new_status: params.new_status,
          days_pending: params.days_pending,
          auto_processed: params.auto_processed
        }
      });
  } catch (error) {
    console.error('Error creating clearing audit record:', error);
    // Don't fail the main process for audit errors
  }
}

/**
 * Get auto-clearing statistics and history
 */
export async function getAutoClearingStats(days: number = 30): Promise<{
  stats: {
    total_auto_cleared: number;
    total_auto_flagged: number;
    avg_days_to_clear: number;
    success_rate: number;
  };
  recent_activity: Array<{
    date: string;
    cleared_count: number;
    flagged_count: number;
    total_amount_cleared: number;
  }>;
}> {
  const supabase = getAdminClient();
  
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get auto-clearing statistics
    const { data: stats } = await supabase
      .from('admin_verifications')
      .select(`
        is_verified,
        verified_at,
        notes,
        metadata
      `)
      .eq('verification_type', 'auto_clearing')
      .gte('verified_at', cutoffDate.toISOString());
    
    const totalAutoCleared = stats?.filter(s => s.is_verified).length || 0;
    const totalAutoFlagged = stats?.filter(s => !s.is_verified).length || 0;
    const successRate = totalAutoCleared + totalAutoFlagged > 0 
      ? (totalAutoCleared / (totalAutoCleared + totalAutoFlagged)) * 100 
      : 0;
    
    // Calculate average days to clear (simplified)
    const avgDaysToClear = 30; // Would need more complex calculation
    
    return {
      stats: {
        total_auto_cleared: totalAutoCleared,
        total_auto_flagged: totalAutoFlagged,
        avg_days_to_clear: avgDaysToClear,
        success_rate: successRate
      },
      recent_activity: [] // Would implement daily breakdown
    };
    
  } catch (error) {
    console.error('Error fetching auto-clearing stats:', error);
    return {
      stats: {
        total_auto_cleared: 0,
        total_auto_flagged: 0,
        avg_days_to_clear: 0,
        success_rate: 0
      },
      recent_activity: []
    };
  }
} 