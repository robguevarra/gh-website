import { NextRequest, NextResponse } from 'next/server';
import { createConversionWithFraudDetection } from '@/lib/services/affiliate/conversion-processor';

/**
 * Test endpoint for fraud detection system
 * Creates sample conversions to test auto-flagging rules
 */
export async function POST(request: NextRequest) {
  try {
    const { testType = 'all', affiliateId } = await request.json();

    if (!affiliateId) {
      return NextResponse.json(
        { error: 'affiliate_id is required for testing' },
        { status: 400 }
      );
    }

    const results = [];

    // Test cases for different fraud scenarios
    const testCases = {
      // Test amount threshold - too high
      amountHigh: {
        affiliate_id: affiliateId,
        order_id: crypto.randomUUID(),
        gmv: 2000, // Way above $455 threshold
        commission_amount: 600,
        level: 1,
        metadata: { test_type: 'amount_high' }
      },

      // Test amount threshold - too low
      amountLow: {
        affiliate_id: affiliateId,
        order_id: crypto.randomUUID(),
        gmv: 100, // Way below $260 threshold
        commission_amount: 30,
        level: 1,
        metadata: { test_type: 'amount_low' }
      },

      // Test normal amount - should not flag
      amountNormal: {
        affiliate_id: affiliateId,
        order_id: crypto.randomUUID(),
        gmv: 350, // Within acceptable range
        commission_amount: 105,
        level: 1,
        metadata: { test_type: 'amount_normal' }
      },

      // Test duplicate order - will flag on second attempt
      duplicateOrder: {
        affiliate_id: affiliateId,
        order_id: crypto.randomUUID(), // Same UUID for both duplicate tests
        gmv: 350,
        commission_amount: 105,
        level: 1,
        metadata: { test_type: 'duplicate_order' }
      }
    };

    // Run specified test or all tests
    if (testType === 'all' || testType === 'amount_high') {
      const result = await createConversionWithFraudDetection(testCases.amountHigh);
      results.push({
        testType: 'amount_high',
        expectedFlag: true,
        ...result
      });
    }

    if (testType === 'all' || testType === 'amount_low') {
      const result = await createConversionWithFraudDetection(testCases.amountLow);
      results.push({
        testType: 'amount_low',
        expectedFlag: true,
        ...result
      });
    }

    if (testType === 'all' || testType === 'amount_normal') {
      const result = await createConversionWithFraudDetection(testCases.amountNormal);
      results.push({
        testType: 'amount_normal',
        expectedFlag: false,
        ...result
      });
    }

    if (testType === 'all' || testType === 'duplicate') {
      // Use the same order_id for both calls to test duplicate detection
      const duplicateOrderId = crypto.randomUUID();
      const duplicateCase = { ...testCases.duplicateOrder, order_id: duplicateOrderId };
      
      // Create first conversion
      const firstResult = await createConversionWithFraudDetection(duplicateCase);
      results.push({
        testType: 'duplicate_first',
        expectedFlag: false,
        ...firstResult
      });

      // Create duplicate conversion (should flag)
      const duplicateResult = await createConversionWithFraudDetection(duplicateCase);
      results.push({
        testType: 'duplicate_second',
        expectedFlag: true,
        ...duplicateResult
      });
    }

    // Test velocity - create multiple conversions rapidly
    if (testType === 'all' || testType === 'velocity') {
      const velocityResults = [];
      
      for (let i = 0; i < 7; i++) { // Create 7 conversions (above 5 limit)
        const result = await createConversionWithFraudDetection({
          affiliate_id: affiliateId,
          order_id: crypto.randomUUID(),
          gmv: 350,
          commission_amount: 105,
          level: 1,
          metadata: { test_type: 'velocity', sequence: i }
        });
        
        velocityResults.push({
          testType: `velocity_${i}`,
          expectedFlag: i >= 5, // Should flag after 5th conversion
          ...result
        });
      }
      
      results.push(...velocityResults);
    }

    // Summary of test results
    const summary = {
      total: results.length,
      flagged: results.filter(r => r.flagged).length,
      correct: results.filter(r => r.flagged === r.expectedFlag).length,
      accuracy: results.length > 0 ? (results.filter(r => r.flagged === r.expectedFlag).length / results.length * 100).toFixed(1) + '%' : '0%'
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
      message: `Fraud detection test completed. ${summary.correct}/${summary.total} tests passed correctly.`
    });

  } catch (error) {
    console.error('Error in fraud detection test:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run fraud detection test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve current fraud detection thresholds and configuration
 */
export async function GET() {
  try {
    const config = {
      thresholds: {
        amount_min: 260, // 20% of $1300
        amount_max: 455, // 35% of $1300
        velocity_limit: 5, // Max conversions per hour
        new_affiliate_days: 30,
        new_affiliate_amount_threshold: 300,
        duplicate_check_days: 30
      },
      product_price: 1300,
      status: 'active',
      version: '1.0.0'
    };

    return NextResponse.json({
      success: true,
      config,
      message: 'Fraud detection configuration retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving fraud detection config:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve fraud detection configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 