'use server';

import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { FraudRiskLevel } from '@/types/admin/fraud-notification';
import { AdminFraudFlagListItem } from '@/types/admin/affiliate';
import { getAllAdminFraudFlags, getFraudFlagsForAffiliate } from '@/lib/actions/affiliate-actions';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

/**
 * Simplified version that assesses the risk level of a fraud flag without requiring DB integration
 * Made async to comply with server action requirements, though the operation is synchronous
 */
export async function assessFraudRiskLevel(flagData: AdminFraudFlagListItem): Promise<{
  level: FraudRiskLevel;
  score: number;
  factors: string[];
}> {
  // Initialize score and factors
  let riskScore = 0;
  const riskFactors: string[] = [];
  
  // Check for patterns that indicate higher risk
  
  // 1. Specific flag reason checks
  const highRiskKeywords = ['self_referral', 'invalid', 'manipulation', 'multiple', 'suspicious'];
  
  if (flagData.reason) {
    const reasonLower = flagData.reason.toLowerCase();
    if (highRiskKeywords.some(keyword => reasonLower.includes(keyword))) {
      riskScore += 25;
      riskFactors.push('High-risk flagging reason detected');
    }
  }
  
  // 2. Check for any suspicious details in the JSONB
  if (flagData.details) {
    // Try to parse any known risk signals from details
    let detailsObj = flagData.details;
    
    // If it's a string (JSON), try to parse it
    if (typeof detailsObj === 'string') {
      try {
        detailsObj = JSON.parse(detailsObj);
      } catch (e) {
        // Not valid JSON, keep as string
      }
    }
    
    // Check for common fraud indicators
    if (detailsObj) {
      if (typeof detailsObj === 'object') {
        // Check for suspicious IP patterns
        if (detailsObj.ip_mismatch || detailsObj.ip_location_mismatch) {
          riskScore += 20;
          riskFactors.push('IP location irregularities detected');
        }
        
        // Check for rapid account activity
        if (detailsObj.rapid_activity || detailsObj.unusual_timing) {
          riskScore += 15;
          riskFactors.push('Unusual activity timing patterns');
        }
        
        // Check for high-value transactions
        if (detailsObj.high_value || detailsObj.large_transaction) {
          riskScore += 15;
          riskFactors.push('Unusually high transaction values');
        }
      }
    }
  }
  
  // 3. For demonstration purposes, let's add a time-based risk factor
  // Recent flags (within last 24 hours) are considered higher risk
  const flagDate = new Date(flagData.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - flagDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCreation < 24) {
    riskScore += 10;
    riskFactors.push('Recently created flag (within 24 hours)');
  }
  
  // For demo purposes, if no factors found yet, add a generic one
  if (riskFactors.length === 0) {
    riskScore += 5;
    riskFactors.push('General review recommended');
  }
  
  // Calculate final risk level
  let riskLevel: FraudRiskLevel = 'low';
  if (riskScore >= 30) {
    riskLevel = 'high';
  } else if (riskScore >= 15) {
    riskLevel = 'medium';
  }
  
  return {
    score: riskScore,
    level: riskLevel,
    factors: riskFactors
  };
}

/**
 * Get high-risk fraud flags for notification purposes
 * This doesn't depend on the admin_fraud_notifications table
 */
export async function getHighRiskFraudFlags() {
  // Use proper caching with a 30-minute revalidation period
  const getFlagsWithCache = unstable_cache(
    async () => {
      try {
        // Get all fraud flags
        const { flags: allFlags, error } = await getAllAdminFraudFlags();
        
        // Handle potential error
        if (error) {
          console.error('Error fetching fraud flags:', error);
          return { 
            flags: [], 
            counts: { total: 0, unresolved: 0, highRisk: 0 }, 
            error: 'Failed to fetch fraud flags' 
          };
        }
        
        // Filter for unresolved flags
        const unresolvedFlags = allFlags.filter(flag => !flag.resolved);
        
        // Assess risk for each flag - must await Promise.all since assessFraudRiskLevel is async
        const assessedFlags = await Promise.all(
          unresolvedFlags.map(async (flag) => {
            const assessment = await assessFraudRiskLevel(flag);
            return {
              ...flag,
              risk: assessment
            };
          })
        );
        
        // Filter for medium and high risk flags
        const highRiskFlags = assessedFlags.filter(
          flag => flag.risk.level === 'high' || flag.risk.level === 'medium'
        );
        
        // For logging purposes only
        console.log(`Found ${highRiskFlags.length} high/medium risk flags out of ${unresolvedFlags.length} unresolved flags`);
        
        return {
          flags: highRiskFlags,
          counts: {
            total: allFlags.length,
            unresolved: unresolvedFlags.length,
            highRisk: highRiskFlags.length
          }
        };
      } catch (err) {
        console.error('Error fetching high risk fraud flags:', err);
        return { 
          flags: [], 
          counts: { total: 0, unresolved: 0, highRisk: 0 },
          error: 'Failed to fetch fraud flags'
        };
      }
    },
    ['high-risk-fraud-flags', 'global-fraud-data'],
    { revalidate: 1800 } // Cache for 30 minutes (1800 seconds)
  );
  
  // Return the cached result
  return getFlagsWithCache();
}

/**
 * Get high-risk fraud flags for a specific affiliate
 * This is useful for showing risk indicators on the affiliate detail page
 */
export async function getHighRiskFraudFlagsForAffiliate(affiliateId: string) {
  // Use unstable_cache to enable caching with a 30-minute revalidation period
  // This helps prevent repeated network requests for the same data
  const getAffiliateRiskWithCache = unstable_cache(
    async () => {
      try {
        // Use the existing function to get fraud flags for this affiliate
        const { flags: affiliateFlags, error } = await getFraudFlagsForAffiliate(affiliateId);
        
        if (error || !affiliateFlags?.length) {
          return { 
            flags: [], 
            counts: { total: 0, unresolved: 0, highRisk: 0 } 
          };
        }
        
        // Filter for unresolved flags
        const unresolvedFlags = affiliateFlags.filter((flag) => !flag.resolved);
        
        // Assess risk for each flag
        const assessedFlags = await Promise.all(
          unresolvedFlags.map(async (flag) => {
            const assessment = await assessFraudRiskLevel(flag);
            return {
              ...flag,
              risk: assessment
            };
          })
        );
        
        // Filter for medium and high risk flags
        const highRiskFlags = assessedFlags.filter(
          flag => flag.risk.level === 'high' || flag.risk.level === 'medium'
        );
        
        return {
          flags: highRiskFlags,
          counts: {
            total: affiliateFlags.length,
            unresolved: unresolvedFlags.length,
            highRisk: highRiskFlags.length
          }
        };
      } catch (err) {
        console.error(`Error in getHighRiskFraudFlagsForAffiliate for affiliate ${affiliateId}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
        return { 
          flags: [], 
          counts: { total: 0, unresolved: 0, highRisk: 0 }, 
          error: errorMessage 
        };
      }
    },
    ['high-risk-fraud-flags', 'affiliate-fraud-data', affiliateId], // Include affiliateId in cache key to make it unique per affiliate
    { revalidate: 1800 } // Cache for 30 minutes (1800 seconds)
  );
  
  // Return the cached result
  return getAffiliateRiskWithCache();
}

/**
 * Mark a high-risk fraud flag as seen (without requiring DB schema changes)
 * This is a simplified version that uses the admin activity log
 */
export async function markFraudFlagAsReviewed(
  flagId: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Log this activity in the admin_activity_log table
    await logAdminActivity({
      admin_user_id: adminId,
      activity_type: 'fraud_flag_reviewed',
      description: `Admin reviewed high-risk fraud flag ${flagId}`,
      details: {
        flagId,
        reviewedAt: new Date().toISOString()
      },
      target_entity_type: 'fraud_flags',
      target_entity_id: flagId
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error marking fraud flag as reviewed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, error: errorMessage };
  }
}
