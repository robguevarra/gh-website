import { NextRequest, NextResponse } from 'next/server';
import { GCashVerificationService } from '@/lib/services/affiliate/gcash-verification';

const verificationService = new GCashVerificationService();

/**
 * Cron job to check for expired GCash verifications
 * Should be called daily via cron service (Vercel Cron, GitHub Actions, etc.)
 * 
 * GET /api/cron/check-expired-verifications
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting expired GCash verification check...');

    // Check for expired verifications
    const result = await verificationService.checkExpiredVerifications();

    const response = {
      success: true,
      message: 'Expired verification check completed',
      results: {
        expired_verifications: result.expired,
        total_expired: result.renewed,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('Expired verification check results:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking expired verifications:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check expired verifications',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger for testing
 * POST /api/cron/check-expired-verifications
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Manual trigger: Starting expired GCash verification check...');

    const result = await verificationService.checkExpiredVerifications();

    const response = {
      success: true,
      message: 'Manual expired verification check completed',
      results: {
        expired_verifications: result.expired,
        total_expired: result.renewed,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('Manual expired verification check results:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in manual expired verification check:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check expired verifications',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
} 