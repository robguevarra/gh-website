import { NextRequest, NextResponse } from 'next/server';
import { runBatchAutomation, createBatchNow, shouldCreateBatch, getEligibleConversions } from '@/lib/services/affiliate/batch-automation';

/**
 * Test endpoint for batch automation system
 * Tests batch creation logic and scheduling
 */
export async function POST(request: NextRequest) {
  try {
    const { testType = 'check', force = false } = await request.json();
    
    switch (testType) {
      case 'check':
        // Check if today is a batch creation day
        const shouldCreate = shouldCreateBatch();
        const { conversions, error } = await getEligibleConversions();
        
        return NextResponse.json({
          success: true,
          shouldCreateBatch: shouldCreate,
          eligibleConversions: conversions?.length || 0,
          conversions: conversions?.slice(0, 3), // First 3 for preview
          error
        });
        
      case 'run':
        // Run the full automation check
        const automationResult = await runBatchAutomation();
        return NextResponse.json({
          success: true,
          result: automationResult
        });
        
      case 'force':
        // Force create a batch for testing
        const forceResult = await createBatchNow(force);
        return NextResponse.json({
          success: true,
          result: forceResult
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: check, run, or force' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Test batch automation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Simple check endpoint
    const shouldCreate = shouldCreateBatch();
    const daysUntilMonthEnd = (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      return lastDayOfMonth - now.getDate();
    })();
    
    return NextResponse.json({
      success: true,
      daysUntilMonthEnd,
      shouldCreateBatch: shouldCreate,
      triggerDay: 5, // Days before month-end when batches are created
      status: shouldCreate ? 'CREATE_BATCH_TODAY' : 'NO_ACTION_NEEDED'
    });
  } catch (error) {
    console.error('Batch automation check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
} 