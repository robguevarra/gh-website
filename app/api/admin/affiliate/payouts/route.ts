import { NextRequest, NextResponse } from 'next/server';
import { getPayoutHistory } from '@/lib/actions/admin/payout-actions';
import { PayoutStatusType } from '@/types/admin/affiliate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status') as PayoutStatusType;
    const affiliateId = searchParams.get('affiliateId');
    const batchId = searchParams.get('batchId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const payoutMethod = searchParams.get('payoutMethod');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' || 'desc';

    // Build filters object
    const filters = {
      ...(status && { status }),
      ...(affiliateId && { affiliateId }),
      ...(batchId && { batchId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(payoutMethod && { payoutMethod }),
    };

    // Call the action function
    const result = await getPayoutHistory({
      filters,
      pagination: { page, pageSize },
      sort: { sortBy, sortDirection }
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: result.data,
      totalCount: result.totalCount,
      totalAmount: result.totalAmount,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(result.totalCount / pageSize),
        hasNext: page * pageSize < result.totalCount,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Payout history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout history' },
      { status: 500 }
    );
  }
} 