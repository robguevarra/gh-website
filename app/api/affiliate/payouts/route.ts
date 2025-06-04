import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, handleServerError, handleUnauthorized } from '@/lib/supabase/route-handler';
import { payoutHistoryFilterSchema, payoutProjectionSchema } from '@/lib/validation/affiliate/payout-schema';
import { Database } from '@/lib/database.types';

/**
 * Verifies that the authenticated user is an active affiliate
 * @returns Object containing supabase client and affiliate data if valid, throws otherwise
 */
async function verifyActiveAffiliate() {
  const supabase = await createRouteHandlerClient();
  
  // Check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Unauthorized: User not authenticated');
  }
  
  // Get user's affiliate profile
  const { data: profile, error: profileError } = await supabase
    .from('unified_profiles')
    .select('affiliate_id, affiliate_general_status')
    .eq('id', session.user.id)
    .single();
  
  if (profileError || !profile || !profile.affiliate_id) {
    throw new Error('Unauthorized: User is not an affiliate');
  }
  
  // Verify affiliate status is active
  if (profile.affiliate_general_status !== 'active') {
    throw new Error(`Unauthorized: Affiliate status is '${profile.affiliate_general_status}', must be 'active'`);
  }
  
  return { supabase, userId: session.user.id, affiliateId: profile.affiliate_id };
}

/**
 * Calculates payout projections for the affiliate
 * @param supabase Supabase client
 * @param affiliateId The affiliate's ID
 * @returns Payout projection data
 */
async function calculatePayoutProjection(supabase: any, affiliateId: string) {
  // Get all cleared but unpaid conversions
  const { data: pendingConversions, error: conversionsError } = await supabase
    .from('affiliate_conversions')
    .select('commission_amount')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'cleared');
  
  if (conversionsError) {
    console.error('Error fetching pending conversions:', conversionsError);
    throw new Error('Failed to calculate payout projections');
  }
  
  // Calculate pending amount from cleared conversions
  const pendingAmount = pendingConversions.reduce(
    (sum: number, conversion: any) => sum + (conversion.commission_amount || 0),
    0
  );
  
  // Get payout settings
  const PAYOUT_THRESHOLD = 100; // Example: $100 minimum payout threshold
  const PAYOUT_SCHEDULE_DAYS = 30; // Example: Monthly payouts
  
  // Calculate next payout date (first day of next month)
  const today = new Date();
  const nextPayoutDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  // Calculate estimated next payout amount
  const estimatedNextPayout = pendingAmount >= PAYOUT_THRESHOLD ? pendingAmount : 0;
  
  return {
    pending_amount: pendingAmount,
    estimated_next_payout: estimatedNextPayout,
    next_payout_date: estimatedNextPayout > 0 ? nextPayoutDate.toISOString() : null,
    threshold_amount: PAYOUT_THRESHOLD,
  };
}

/**
 * GET /api/affiliate/payouts
 * Retrieves the authenticated affiliate's payout history
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, affiliateId } = await verifyActiveAffiliate();
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 10;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset') as string, 10) : 0;
    
    // Validate query parameters
    const validatedFilter = payoutHistoryFilterSchema.parse({
      status: status as any,
      start_date: startDate,
      end_date: endDate,
      limit,
      offset,
    });
    
    // Build query for payout transactions
    let query = supabase
      .from('affiliate_payout_transactions' as any)
      .select('id, amount, status, payment_method, payment_details, reference_id, notes, created_at, updated_at, processed_at', { count: 'exact' })
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
      .range(validatedFilter.offset || 0, (validatedFilter.offset || 0) + (validatedFilter.limit || 10) - 1);
    
    // Add optional filters
    if (validatedFilter.status) {
      query = query.eq('status', validatedFilter.status);
    }
    
    if (validatedFilter.start_date) {
      query = query.gte('created_at', validatedFilter.start_date);
    }
    
    if (validatedFilter.end_date) {
      query = query.lte('created_at', validatedFilter.end_date);
    }
    
    // Execute query
    const { data: transactions, error: transactionsError, count } = await query;
    
    if (transactionsError) {
      console.error('Error fetching payout transactions:', transactionsError);
      return handleServerError('Failed to fetch payout history');
    }
    
    // Get payout projections
    const projectionData = await calculatePayoutProjection(supabase, affiliateId);
    
    // Validate projection data
    const validatedProjection = payoutProjectionSchema.parse(projectionData);
    
    // Set cache headers (5 minutes)
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    
    return NextResponse.json({
      transactions,
      total: count || 0,
      limit: validatedFilter.limit || 10,
      offset: validatedFilter.offset || 0,
      projection: validatedProjection,
    }, { 
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error in GET /api/affiliate/payouts:', error);
    
    if (error instanceof Error) {
      if (error.message.startsWith('Unauthorized:')) {
        return handleUnauthorized();
      }
      
      // Check for Zod validation errors
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid request parameters', details: error.message },
          { status: 400 }
        );
      }
    }
    
    return handleServerError('Failed to retrieve payout information');
  }
}
