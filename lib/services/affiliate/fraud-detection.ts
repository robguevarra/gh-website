import { createServiceRoleClient } from '@/lib/supabase/server';

// Industry standard fraud detection thresholds for $1300 product
const FRAUD_THRESHOLDS = {
  AMOUNT_MIN: 260, // 20% of $1300
  AMOUNT_MAX: 455, // 35% of $1300
  VELOCITY_LIMIT: 5, // Max conversions per hour per affiliate
  NEW_AFFILIATE_DAYS: 30, // Consider affiliate "new" for 30 days
  NEW_AFFILIATE_AMOUNT_THRESHOLD: 300, // Flag high amounts from new affiliates
  DUPLICATE_CHECK_DAYS: 30, // Check for duplicates within 30 days
} as const;

export interface FlagReason {
  type: 'AMOUNT_THRESHOLD' | 'DUPLICATE_ORDER' | 'HIGH_VELOCITY' | 'NEW_AFFILIATE_HIGH_VALUE';
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConversionFlagResult {
  shouldFlag: boolean;
  reasons: FlagReason[];
  riskScore: number; // 0-100
}

interface ConversionData {
  id: string;
  affiliate_id: string;
  gmv: number;
  order_id: string;
  created_at: string;
}

interface DatabaseConversion {
  id: string;
  affiliate_id: string;
  created_at: string;
  gmv?: number;
}

interface AffiliateData {
  created_at: string;
  user_id: string;
}

/**
 * Comprehensive fraud detection for affiliate conversions
 * Implements industry best practices for affiliate fraud prevention
 */
export class AffiliateConversionFraudDetector {
  /**
   * Main fraud detection entry point
   * Runs all detection rules and returns flagging decision
   */
  async detectFraud(conversion: ConversionData): Promise<ConversionFlagResult> {
    const reasons: FlagReason[] = [];
    let riskScore = 0;

    // Run all detection rules
    const amountCheck = await this.checkAmountThreshold(conversion);
    const duplicateCheck = await this.checkDuplicateOrder(conversion);
    const velocityCheck = await this.checkVelocity(conversion);
    const newAffiliateCheck = await this.checkNewAffiliatePattern(conversion);

    // Aggregate results
    if (amountCheck.shouldFlag) {
      reasons.push(...amountCheck.reasons);
      riskScore += 30;
    }

    if (duplicateCheck.shouldFlag) {
      reasons.push(...duplicateCheck.reasons);
      riskScore += 40;
    }

    if (velocityCheck.shouldFlag) {
      reasons.push(...velocityCheck.reasons);
      riskScore += 25;
    }

    if (newAffiliateCheck.shouldFlag) {
      reasons.push(...newAffiliateCheck.reasons);
      riskScore += 20;
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    return {
      shouldFlag: reasons.length > 0,
      reasons,
      riskScore
    };
  }

  /**
   * Check if conversion amount is outside normal range
   * Industry standard: Flag amounts significantly above/below product price
   */
  private async checkAmountThreshold(conversion: { gmv: number }): Promise<ConversionFlagResult> {
    const reasons: FlagReason[] = [];

    if (conversion.gmv > FRAUD_THRESHOLDS.AMOUNT_MAX || conversion.gmv < FRAUD_THRESHOLDS.AMOUNT_MIN) {
      reasons.push({
        type: 'AMOUNT_THRESHOLD',
        severity: conversion.gmv > FRAUD_THRESHOLDS.AMOUNT_MAX * 2 ? 'critical' : 'medium',
        details: {
          amount: conversion.gmv,
          threshold_min: FRAUD_THRESHOLDS.AMOUNT_MIN,
          threshold_max: FRAUD_THRESHOLDS.AMOUNT_MAX,
          product_price: 1300,
          deviation_percentage: Math.abs((conversion.gmv - 1300) / 1300 * 100)
        }
      });
    }

    return {
      shouldFlag: reasons.length > 0,
      reasons,
      riskScore: reasons.length > 0 ? 30 : 0
    };
  }

  /**
   * Check for duplicate order IDs within timeframe
   * Industry standard: Prevent double-attribution fraud
   */
  private async checkDuplicateOrder(conversion: { id: string; order_id: string }): Promise<ConversionFlagResult> {
    const reasons: FlagReason[] = [];

    if (!conversion.order_id) {
      return { shouldFlag: false, reasons: [], riskScore: 0 };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - FRAUD_THRESHOLDS.DUPLICATE_CHECK_DAYS);

    const supabase = await createServiceRoleClient();
    const { data: duplicates, error } = await supabase
      .from('affiliate_conversions')
      .select('id, affiliate_id, created_at')
      .eq('order_id', conversion.order_id)
      .neq('id', conversion.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Error checking duplicate orders:', error);
      return { shouldFlag: false, reasons: [], riskScore: 0 };
    }

    if (duplicates && duplicates.length > 0) {
      reasons.push({
        type: 'DUPLICATE_ORDER',
        severity: 'high',
        details: {
          order_id: conversion.order_id,
          duplicate_count: duplicates.length,
          original_conversion_ids: duplicates.map((d: any) => d.id),
          duplicate_affiliates: duplicates.map((d: any) => d.affiliate_id),
          check_period_days: FRAUD_THRESHOLDS.DUPLICATE_CHECK_DAYS
        }
      });
    }

    return {
      shouldFlag: reasons.length > 0,
      reasons,
      riskScore: reasons.length > 0 ? 40 : 0
    };
  }

  /**
   * Check for high-velocity conversions from same affiliate
   * Industry standard: Detect bot/automated fraud attempts
   */
  private async checkVelocity(conversion: { affiliate_id: string; created_at: string }): Promise<ConversionFlagResult> {
    const reasons: FlagReason[] = [];

    const oneHourAgo = new Date(conversion.created_at);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const supabase = await createServiceRoleClient();
    const { data: recentConversions, error } = await supabase
      .from('affiliate_conversions')
      .select('id, created_at, gmv')
      .eq('affiliate_id', conversion.affiliate_id)
      .gte('created_at', oneHourAgo.toISOString());

    if (error) {
      console.error('Error checking velocity:', error);
      return { shouldFlag: false, reasons: [], riskScore: 0 };
    }

    if (recentConversions && recentConversions.length > FRAUD_THRESHOLDS.VELOCITY_LIMIT) {
      const totalValue = recentConversions.reduce((sum: number, conv: any) => sum + (conv.gmv || 0), 0);
      
      reasons.push({
        type: 'HIGH_VELOCITY',
        severity: recentConversions.length > FRAUD_THRESHOLDS.VELOCITY_LIMIT * 2 ? 'critical' : 'high',
        details: {
          conversion_count: recentConversions.length,
          timeframe_hours: 1,
          velocity_limit: FRAUD_THRESHOLDS.VELOCITY_LIMIT,
          total_value: totalValue,
          affiliate_id: conversion.affiliate_id,
          conversion_timestamps: recentConversions.map((c: any) => c.created_at)
        }
      });
    }

    return {
      shouldFlag: reasons.length > 0,
      reasons,
      riskScore: reasons.length > 0 ? 25 : 0
    };
  }

  /**
   * Check for suspicious patterns from new affiliates
   * Industry standard: New affiliates with high-value conversions need review
   */
  private async checkNewAffiliatePattern(conversion: { affiliate_id: string; gmv: number }): Promise<ConversionFlagResult> {
    const reasons: FlagReason[] = [];

    // Get affiliate registration date
    const supabase = await createServiceRoleClient();
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('created_at, user_id')
      .eq('id', conversion.affiliate_id)
      .single();

    if (error || !affiliate) {
      console.error('Error checking affiliate info:', error);
      return { shouldFlag: false, reasons: [], riskScore: 0 };
    }

    const affiliateData = affiliate as AffiliateData;
    const affiliateAge = new Date().getTime() - new Date(affiliateData.created_at).getTime();
    const daysSinceRegistration = Math.floor(affiliateAge / (1000 * 60 * 60 * 24));

    // Flag if new affiliate with high-value conversion
    if (daysSinceRegistration < FRAUD_THRESHOLDS.NEW_AFFILIATE_DAYS && 
        conversion.gmv > FRAUD_THRESHOLDS.NEW_AFFILIATE_AMOUNT_THRESHOLD) {
      
      reasons.push({
        type: 'NEW_AFFILIATE_HIGH_VALUE',
        severity: daysSinceRegistration < 7 ? 'high' : 'medium',
        details: {
          affiliate_age_days: daysSinceRegistration,
          conversion_amount: conversion.gmv,
          threshold_amount: FRAUD_THRESHOLDS.NEW_AFFILIATE_AMOUNT_THRESHOLD,
          new_affiliate_threshold_days: FRAUD_THRESHOLDS.NEW_AFFILIATE_DAYS,
          affiliate_id: conversion.affiliate_id,
          registration_date: affiliateData.created_at
        }
      });
    }

    return {
      shouldFlag: reasons.length > 0,
      reasons,
      riskScore: reasons.length > 0 ? 20 : 0
    };
  }

  /**
   * Flag a conversion as fraudulent in the database
   * Updates conversion status and creates detailed flag record
   */
  async flagConversion(
    conversionId: string,
    flagReasons: FlagReason[],
    riskScore: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createServiceRoleClient();
      
      // Update conversion status to flagged
      const { error: updateError } = await supabase
        .from('affiliate_conversions')
        .update({ 
          status: 'flagged',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversionId);

      if (updateError) {
        console.error('Error updating conversion status:', updateError);
        return { success: false, error: updateError.message };
      }

      // Get affiliate_id for the conversion first
      const { data: conversionData } = await supabase
        .from('affiliate_conversions')
        .select('affiliate_id')
        .eq('id', conversionId)
        .single();

      if (!conversionData) {
        return { success: false, error: 'Conversion not found' };
      }

      // Create detailed fraud flag record
      const flagDetails = JSON.stringify({
        conversion_id: conversionId,
        reasons: flagReasons,
        risk_score: riskScore,
        detection_timestamp: new Date().toISOString(),
        auto_flagged: true
      });

      const { error: flagError } = await supabase
        .from('fraud_flags')
        .insert({
          affiliate_id: conversionData.affiliate_id,
          reason: 'AUTO_FRAUD_DETECTION',
          details: flagDetails,
          resolved: false
        });

      if (flagError) {
        console.error('Error creating fraud flag:', flagError);
        return { success: false, error: flagError.message };
      }

      console.log(`Conversion ${conversionId} flagged with risk score ${riskScore}:`, flagReasons);
      return { success: true };

    } catch (error) {
      console.error('Error in flagConversion:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Main export function for easy use in conversion processing
 * Call this after every new conversion is created
 */
export async function runFraudDetection(conversion: ConversionData): Promise<{ 
  flagged: boolean; 
  riskScore: number; 
  reasons: FlagReason[] 
}> {
  const detector = new AffiliateConversionFraudDetector();
  
  const result = await detector.detectFraud(conversion);
  
  if (result.shouldFlag) {
    const flagResult = await detector.flagConversion(
      conversion.id,
      result.reasons,
      result.riskScore
    );
    
    if (!flagResult.success) {
      console.error('Failed to flag conversion:', flagResult.error);
    }
  }

  return {
    flagged: result.shouldFlag,
    riskScore: result.riskScore,
    reasons: result.reasons
  };
}

export default AffiliateConversionFraudDetector; 