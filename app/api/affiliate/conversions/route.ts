import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, handleServerError, handleUnauthorized } from '@/lib/supabase/route-handler';
import { Database } from '@/types/supabase';

type ConversionStatus = Database['public']['Enums']['conversion_status_type'];

/**
 * Verifies that the authenticated user is an active affiliate
 * @returns Object containing supabase client and affiliate data if valid, throws otherwise
 */
async function verifyActiveAffiliate() {
  const supabase = await createRouteHandlerClient();
  
  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized: User not authenticated');
  }
  
  // Get user's affiliate profile
  const { data: profile, error: profileError } = await supabase
    .from('unified_profiles')
    .select('affiliate_id, affiliate_general_status')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile || !profile.affiliate_id) {
    throw new Error('Unauthorized: User is not an affiliate');
  }
  
  // Verify affiliate status is active
  if (profile.affiliate_general_status !== 'active') {
    throw new Error(`Unauthorized: Affiliate status is '${profile.affiliate_general_status}', must be 'active'`);
  }
  
  return { supabase, userId: user.id, affiliateId: profile.affiliate_id };
}

/**
 * GET /api/affiliate/conversions
 * Retrieves the authenticated affiliate's conversion history
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, affiliateId } = await verifyActiveAffiliate();
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset') as string, 10) : 0;
    
    // Build query for conversions - only show payout-eligible conversions by default
    let query = supabase
      .from('affiliate_conversions')
      .select(`
        id,
        order_id,
        commission_amount,
        status,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Add optional status filter
    if (status && status !== 'all') {
      query = query.eq('status', status as ConversionStatus);
    }
    // Note: By default, show ALL conversions for transparency
    
    // Execute query
    const { data: conversions, error: conversionsError, count } = await query;
    
    if (conversionsError) {
      console.error('Error fetching conversions:', conversionsError);
      return handleServerError('Failed to fetch conversion history');
    }
    
    // Add comprehensive logging for debugging
    console.log('🔄 CONVERSIONS API DEBUG - Raw Data:');
    console.log('- Affiliate ID:', affiliateId);
    console.log('- Query Filters:', { status, limit, offset });
    console.log('- Raw Conversions Count:', conversions?.length || 0);
    console.log('- Raw Conversions Data:', conversions?.map(c => ({
      id: c.id,
      order_id: c.order_id,
      commission_amount: c.commission_amount,
      status: c.status,
      created_at: c.created_at
    })) || []);
    console.log('- Total Count from DB:', count);
    
    // Set cache headers (5 minutes)
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    
    return NextResponse.json({
      conversions: conversions || [],
      total: count || 0,
      limit,
      offset,
    }, { 
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error in GET /api/affiliate/conversions:', error);
    
    if (error instanceof Error) {
      if (error.message.startsWith('Unauthorized:')) {
        return handleUnauthorized();
      }
    }
    
    return handleServerError('Failed to retrieve conversion information');
  }
} 