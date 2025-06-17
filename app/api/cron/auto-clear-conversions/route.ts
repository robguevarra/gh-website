import { NextRequest, NextResponse } from 'next/server';
import { runAutoClearingProcess } from '@/lib/services/affiliate/auto-clearing';

/**
 * Cron job endpoint for automated conversion clearing
 * Should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions)
 * 
 * Usage:
 * - Set up a daily cron job to call this endpoint
 * - Add authentication header for security
 * - Monitor the response for errors
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron authentication
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.CRON_SECRET;
    
    if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Starting automated conversion clearing process...');
    
    // Run the auto-clearing process
    const result = await runAutoClearingProcess();
    
    // Log the results
    console.log('Auto-clearing process completed:', {
      total_processed: result.total_processed,
      cleared_count: result.cleared_count,
      flagged_count: result.flagged_count,
      error_count: result.errors.length
    });
    
    // Return success response with details
    return NextResponse.json({
      success: true,
      message: 'Auto-clearing process completed',
      results: {
        total_processed: result.total_processed,
        cleared_count: result.cleared_count,
        flagged_count: result.flagged_count,
        errors: result.errors
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Auto-clearing cron job failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Auto-clearing process failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing and status checks
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication for manual testing
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.CRON_SECRET;
    
    if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Return status information
    return NextResponse.json({
      message: 'Auto-clearing cron endpoint is active',
      endpoint: '/api/cron/auto-clear-conversions',
      method: 'POST',
      authentication: 'Bearer token required',
      schedule: 'Daily at 2:00 AM UTC (recommended)',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
} 