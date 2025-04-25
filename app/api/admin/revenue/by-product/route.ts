import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Database } from '@/types/supabase';

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sourcePlatform: z.enum(['xendit', 'shopify']).optional(),
});

// Define the structure for product revenue data (matching RPC output)
interface ProductRevenue {
  product_identifier: string;
  product_name: string;
  source_platform: 'xendit' | 'shopify';
  total_revenue: number;
  units_sold: number;
  average_transaction_value: number;
}

/**
 * GET handler for fetching revenue aggregated by product.
 * Uses the get_revenue_by_product RPC function.
 * Supports filtering by date range and source platform.
 *
 * @param {NextRequest} request - The incoming request object.
 * @returns {Promise<NextResponse>} A response containing the product revenue breakdown or an error.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // Correct client initialization structure
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { // This is the correct structure
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Auth check

  const searchParams = request.nextUrl.searchParams;
  const parseResult = querySchema.safeParse({
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    sourcePlatform: searchParams.get('sourcePlatform') ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: parseResult.error.errors }, { status: 400 });
  }

  const { startDate, endDate, sourcePlatform } = parseResult.data;

  try {
    const rpcParams = {
      p_start_date: startDate,
      p_end_date: endDate,
      p_source_platform: sourcePlatform,
    };

    // Call the RPC function (assuming it exists)
    // We will create get_revenue_by_product next.
    const { data, error } = await supabase.rpc('get_revenue_by_product' as any, rpcParams);

    if (error) {
      console.error('Error fetching revenue by product from Supabase RPC:', error);
      // Add specific error checks if the RPC function raises them
      throw error;
    }

    const productRevenue: ProductRevenue[] = (data as ProductRevenue[]) ?? [];

    return NextResponse.json(productRevenue);

  } catch (error: any) {
    console.error('[API /revenue/by-product Error]', error);
    return NextResponse.json({ error: 'Failed to fetch revenue by product', details: error.message || 'Unknown error' }, { status: 500 });
  }
} 