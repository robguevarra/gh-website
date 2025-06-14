import { createServiceRoleClient } from '@/lib/supabase/server';
import { runFraudDetection } from './fraud-detection';

export interface ConversionProcessorResult {
  success: boolean;
  conversionId?: string;
  flagged: boolean;
  riskScore: number;
  error?: string;
}

export interface CreateConversionParams {
  affiliate_id: string;
  order_id: string;
  gmv: number;
  commission_amount: number;
  level: number;
  customer_email?: string;
  customer_name?: string;
  product_name?: string;
  metadata?: Record<string, any>;
}

/**
 * Service class for processing affiliate conversions with integrated fraud detection
 * Handles the complete conversion workflow from creation to fraud analysis
 */
export class AffiliateConversionProcessor {
  
  /**
   * Process a new affiliate conversion with automatic fraud detection
   * Creates the conversion record and runs fraud analysis in one transaction
   */
  async processConversion(params: CreateConversionParams): Promise<ConversionProcessorResult> {
    try {
      const supabase = await createServiceRoleClient();
      
      // First, create the conversion record
      const conversionData = {
        affiliate_id: params.affiliate_id,
        order_id: params.order_id,
        gmv: params.gmv,
        commission_amount: params.commission_amount,
        level: params.level,
        status: 'pending' as const, // Start as pending, fraud detection may change to flagged
        created_at: new Date().toISOString()
      };

      const { data: conversion, error: createError } = await supabase
        .from('affiliate_conversions')
        .insert(conversionData)
        .select('id, affiliate_id, gmv, order_id, created_at')
        .single();

      if (createError || !conversion) {
        console.error('Error creating conversion:', createError);
        return {
          success: false,
          flagged: false,
          riskScore: 0,
          error: createError?.message || 'Failed to create conversion'
        };
      }

      // Run fraud detection on the newly created conversion
      const fraudResult = await runFraudDetection({
        id: conversion.id,
        affiliate_id: conversion.affiliate_id,
        gmv: conversion.gmv,
        order_id: conversion.order_id || '',
        created_at: conversion.created_at
      });

      console.log(`Conversion ${conversion.id} processed - Flagged: ${fraudResult.flagged}, Risk Score: ${fraudResult.riskScore}`);
      
      // Log fraud detection results for monitoring
      if (fraudResult.flagged) {
        console.log(`Conversion ${conversion.id} flagged for fraud:`, fraudResult.reasons);
      }

      return {
        success: true,
        conversionId: conversion.id,
        flagged: fraudResult.flagged,
        riskScore: fraudResult.riskScore
      };

    } catch (error) {
      console.error('Error in processConversion:', error);
      return {
        success: false,
        flagged: false,
        riskScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Bulk process multiple conversions with fraud detection
   * Useful for importing historical data or batch processing
   */
  async bulkProcessConversions(conversions: CreateConversionParams[]): Promise<{
    processed: number;
    flagged: number;
    errors: string[];
    results: ConversionProcessorResult[];
  }> {
    const results: ConversionProcessorResult[] = [];
    const errors: string[] = [];
    let flaggedCount = 0;

    for (const conversion of conversions) {
      try {
        const result = await this.processConversion(conversion);
        results.push(result);
        
        if (!result.success && result.error) {
          errors.push(`Order ${conversion.order_id}: ${result.error}`);
        }
        
        if (result.flagged) {
          flaggedCount++;
        }
      } catch (error) {
        const errorMsg = `Order ${conversion.order_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        results.push({
          success: false,
          flagged: false,
          riskScore: 0,
          error: errorMsg
        });
      }
    }

    return {
      processed: results.filter(r => r.success).length,
      flagged: flaggedCount,
      errors,
      results
    };
  }

  /**
   * Reprocess existing conversion for fraud detection
   * Useful for applying new fraud rules to historical data
   */
  async reprocessConversionForFraud(conversionId: string): Promise<{
    success: boolean;
    flagged: boolean;
    riskScore: number;
    previousStatus?: string;
    error?: string;
  }> {
    try {
      const supabase = await createServiceRoleClient();
      
      // Get existing conversion data
      const { data: conversion, error: fetchError } = await supabase
        .from('affiliate_conversions')
        .select('id, affiliate_id, gmv, order_id, created_at, status')
        .eq('id', conversionId)
        .single();

      if (fetchError || !conversion) {
        return {
          success: false,
          flagged: false,
          riskScore: 0,
          error: 'Conversion not found'
        };
      }

      const previousStatus = conversion.status;

      // Run fraud detection
      const fraudResult = await runFraudDetection({
        id: conversion.id,
        affiliate_id: conversion.affiliate_id,
        gmv: conversion.gmv,
        order_id: conversion.order_id || '',
        created_at: conversion.created_at
      });

      return {
        success: true,
        flagged: fraudResult.flagged,
        riskScore: fraudResult.riskScore,
        previousStatus
      };

    } catch (error) {
      console.error('Error in reprocessConversionForFraud:', error);
      return {
        success: false,
        flagged: false,
        riskScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Main export function for easy use in API routes and webhooks
 * Processes a single conversion with fraud detection
 */
export async function createConversionWithFraudDetection(
  params: CreateConversionParams
): Promise<ConversionProcessorResult> {
  const processor = new AffiliateConversionProcessor();
  return await processor.processConversion(params);
}

/**
 * Bulk process conversions with fraud detection
 * Useful for importing or batch processing
 */
export async function bulkCreateConversionsWithFraudDetection(
  conversions: CreateConversionParams[]
) {
  const processor = new AffiliateConversionProcessor();
  return await processor.bulkProcessConversions(conversions);
}

export default AffiliateConversionProcessor; 