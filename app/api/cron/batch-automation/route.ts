import { NextRequest, NextResponse } from 'next/server';
import { runBatchAutomation } from '@/lib/services/affiliate/batch-automation';

/**
 * Cron endpoint for daily batch automation
 * Should be called daily by a scheduling service (Vercel Cron, GitHub Actions, etc.)
 * 
 * Usage with Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/batch-automation",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 * 
 * This runs daily at 9:00 AM UTC
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from a trusted source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }
    
    console.log(`🤖 Daily Batch Automation Check - ${new Date().toISOString()}`);
    
    // Run the batch automation logic
    const result = await runBatchAutomation();
    
    // Log the result for monitoring
    console.log(`Batch Automation Result:`, result);
    
    // Return success response with details
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: result,
      message: result.summary
    });
    
  } catch (error) {
    console.error('Cron batch automation error:', error);
    
    // Return error response
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: `Batch automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers with authentication
export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid secret' },
        { status: 401 }
      );
    }
    
    console.log(`🚨 Manual Batch Automation Trigger - ${new Date().toISOString()}`);
    
    const result = await runBatchAutomation();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      trigger: 'manual',
      result: result,
      message: result.summary
    });
    
  } catch (error) {
    console.error('Manual batch automation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        trigger: 'manual',
        error: `Batch automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
} 