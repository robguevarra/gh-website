'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { FraudNotification, FraudRiskLevel, FraudRiskScore } from '@/types/admin/fraud-notification';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';
import { AdminFraudFlagListItem } from '@/types/admin/affiliate';

/**
 * Assesses the risk level of a fraud flag based on various factors
 */
export function assessFraudRiskLevel(flagData: AdminFraudFlagListItem): FraudRiskScore {
  // Initialize score and factors
  let riskScore = 0;
  const riskFactors: string[] = [];
  
  // Check for patterns that indicate higher risk
  
  // 1. Multiple conversions in short timeframe (if available in details)
  if (flagData.details && flagData.details.rapid_conversions) {
    riskScore += 30;
    riskFactors.push('Multiple conversions in short timeframe');
  }
  
  // 2. Suspicious IP patterns
  if (flagData.details && flagData.details.ip_location_mismatch) {
    riskScore += 25;
    riskFactors.push('IP location mismatch with profile');
  }
  
  // 3. Abnormal conversion rates
  if (flagData.details && flagData.details.abnormal_conversion_rate) {
    riskScore += 20;
    riskFactors.push('Abnormally high conversion rate');
  }
  
  // 4. Large transaction amounts
  if (flagData.details && flagData.details.high_value_transactions) {
    riskScore += 15;
    riskFactors.push('Unusually high transaction values');
  }
  
  // 5. Specific flag reason checks
  const highRiskReasons = ['self_referral', 'invalid_traffic', 'commission_manipulation'];
  if (highRiskReasons.some(reason => flagData.reason.toLowerCase().includes(reason))) {
    riskScore += 25;
    riskFactors.push('High-risk flagging reason');
  }
  
  // Calculate final risk level
  let riskLevel: FraudRiskLevel = 'low';
  if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
  }
  
  return {
    score: riskScore,
    level: riskLevel,
    factors: riskFactors
  };
}

/**
 * Fetches unread fraud notifications for admin dashboard
 */
export async function getUnreadFraudNotifications(): Promise<{ notifications: FraudNotification[], error?: string }> {
  noStore();
  const supabase = getAdminClient();
  
  try {
    // Join with fraud_flags and unified_profiles to get complete information
    const { data, error } = await supabase
      .from('admin_fraud_notifications')
      .select(`
        *,
        fraud_flag:flag_id(
          id,
          affiliate_id,
          reason,
          details,
          created_at
        ),
        affiliate:affiliate_id(
          id,
          unified_profile:user_id(
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('read', false)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching fraud notifications:', error.message);
      return { notifications: [], error: `Failed to fetch notifications: ${error.message}` };
    }
    
    // Format the notifications data for UI consumption
    const formattedNotifications: FraudNotification[] = data.map(item => {
      const affiliateProfile = item.affiliate?.unified_profile;
      const affiliateName = affiliateProfile 
        ? `${affiliateProfile.first_name || ''} ${affiliateProfile.last_name || ''}`.trim() 
        : 'Unknown Affiliate';
        
      return {
        id: item.id,
        flag_id: item.flag_id,
        affiliate_id: item.affiliate_id,
        affiliate_name: affiliateName,
        risk_level: item.risk_level,
        reason: item.fraud_flag?.reason || 'Unknown reason',
        details: item.fraud_flag?.details || null,
        read: item.read,
        created_at: item.created_at
      };
    });
    
    return { notifications: formattedNotifications };
  } catch (err) {
    console.error('Unexpected error in getUnreadFraudNotifications:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { notifications: [], error: errorMessage };
  }
}

/**
 * Marks a fraud notification as read
 */
export async function markFraudNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  
  try {
    const { error } = await supabase
      .from('admin_fraud_notifications')
      .update({ read: true })
      .eq('id', notificationId);
      
    if (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error);
      return { success: false, error: `Failed to update notification: ${error.message}` };
    }
    
    // Log admin activity
    await logAdminActivity({
      activity_type: 'FRAUD_FLAG_CREATED',
      description: `Reviewed fraud notification (ID: ${notificationId})`,
      target_entity_id: notificationId,
      details: { notificationId }
    });
    
    // Revalidate paths that might show notifications
    revalidatePath('/admin/affiliates/analytics');
    revalidatePath('/admin/affiliates/flags');
    
    return { success: true };
  } catch (err) {
    console.error(`Unexpected error marking notification ${notificationId} as read:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Process new or updated fraud flags and create notifications for high-risk flags
 * This function should be called when a new fraud flag is created
 */
export async function processAndNotifyForFraudFlag(
  flagData: AdminFraudFlagListItem
): Promise<{ success: boolean; notification_created: boolean; error?: string }> {
  const supabase = getAdminClient();
  
  try {
    // Assess the risk level
    const riskAssessment = assessFraudRiskLevel(flagData);
    
    // Only create notifications for medium and high risk flags
    if (riskAssessment.level === 'low') {
      return { success: true, notification_created: false };
    }
    
    // Check if a notification already exists for this flag
    const { data: existingNotification, error: checkError } = await supabase
      .from('admin_fraud_notifications')
      .select('id')
      .eq('flag_id', flagData.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned which is fine
      console.error(`Error checking existing notifications for flag ${flagData.id}:`, checkError);
      return { success: false, notification_created: false, error: checkError.message };
    }
    
    if (existingNotification) {
      // Update existing notification if risk level changed
      const { error: updateError } = await supabase
        .from('admin_fraud_notifications')
        .update({ 
          risk_level: riskAssessment.level,
          risk_factors: riskAssessment.factors,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingNotification.id);
        
      if (updateError) {
        console.error(`Error updating notification for flag ${flagData.id}:`, updateError);
        return { success: false, notification_created: false, error: updateError.message };
      }
      
      return { success: true, notification_created: false };
    }
    
    // Create a new notification
    const { error: insertError } = await supabase
      .from('admin_fraud_notifications')
      .insert([{
        flag_id: flagData.id,
        affiliate_id: flagData.affiliate_id,
        risk_level: riskAssessment.level,
        risk_factors: riskAssessment.factors,
        risk_score: riskAssessment.score,
        read: false
      }]);
      
    if (insertError) {
      console.error(`Error creating notification for flag ${flagData.id}:`, insertError);
      return { success: false, notification_created: false, error: insertError.message };
    }
    
    // Revalidate paths that might show notifications
    revalidatePath('/admin/affiliates/analytics');
    revalidatePath('/admin/affiliates/flags');
    
    return { success: true, notification_created: true };
  } catch (err) {
    console.error(`Unexpected error processing flag ${flagData.id} for notification:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, notification_created: false, error: errorMessage };
  }
}
