import { NextRequest, NextResponse } from 'next/server';
import { GCashVerificationService } from '@/lib/services/affiliate/gcash-verification';

const verificationService = new GCashVerificationService();

/**
 * GET /api/admin/gcash-verification - Get pending verifications for admin review
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const affiliateId = searchParams.get('affiliateId');
    const verificationId = searchParams.get('verificationId');

    if (action === 'pending') {
      // Get all pending verifications
      const pendingVerifications = await verificationService.getPendingVerifications();
      
      return NextResponse.json({
        success: true,
        data: pendingVerifications,
        count: pendingVerifications.length,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'status' && affiliateId) {
      // Get verification status for specific affiliate
      const status = await verificationService.getVerificationStatus(affiliateId);
      
      return NextResponse.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=pending or ?action=status&affiliateId=xxx' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in GCash verification GET:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch verification data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/gcash-verification - Initialize or manage verifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, affiliateId, gcashNumber, gcashName, verificationId, adminUserId } = body;

    if (action === 'initialize') {
      // Initialize new verification
      if (!affiliateId || !gcashNumber || !gcashName) {
        return NextResponse.json(
          { error: 'Missing required fields: affiliateId, gcashNumber, gcashName' },
          { status: 400 }
        );
      }

      const result = await verificationService.initializeVerification(
        affiliateId,
        gcashNumber,
        gcashName,
        adminUserId
      );

      return NextResponse.json({
        success: result.success,
        verificationId: result.verificationId,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'send_code') {
      // Send phone verification code
      if (!verificationId) {
        return NextResponse.json(
          { error: 'Missing verificationId' },
          { status: 400 }
        );
      }

      const result = await verificationService.sendPhoneVerificationCode(verificationId);

      return NextResponse.json({
        success: result.success,
        error: result.error,
        message: result.success ? 'Verification code sent successfully' : undefined,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "initialize" or "send_code"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in GCash verification POST:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process verification request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/gcash-verification - Review and approve/reject verifications
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { verificationId, adminUserId, approved, notes, rejectionReason } = body;

    if (!verificationId || !adminUserId || approved === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: verificationId, adminUserId, approved' },
        { status: 400 }
      );
    }

    if (!approved && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting verification' },
        { status: 400 }
      );
    }

    const result = await verificationService.reviewVerification(
      verificationId,
      adminUserId,
      approved,
      notes,
      rejectionReason
    );

    return NextResponse.json({
      success: result.success,
      error: result.error,
      message: result.success 
        ? `Verification ${approved ? 'approved' : 'rejected'} successfully`
        : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in GCash verification PUT:', error);
    return NextResponse.json(
      { 
        error: 'Failed to review verification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 