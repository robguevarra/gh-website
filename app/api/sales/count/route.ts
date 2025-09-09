import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const product = searchParams.get('product');

    if (!product) {
      return NextResponse.json(
        { error: 'Product parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    // Count completed sales from public_sale_orders table
    const { data, error, count } = await supabase
      .from('public_sale_orders')
      .select('*', { count: 'exact', head: true })
      .eq('product_code', product)
      .not('delivered_at', 'is', null); // Only count delivered orders

    if (error) {
      console.error('Error fetching sales count:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
      product
    });

  } catch (error) {
    console.error('Sales count API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
