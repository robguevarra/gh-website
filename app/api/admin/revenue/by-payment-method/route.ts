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

// Define the structure for payment method revenue data
interface PaymentMethodRevenue {
  payment_method: string;
  source_platform: 'xendit' | 'shopify'; // Group by source as well for clarity
  total_revenue: number;
  transaction_count: number;
}

// Define the expected row structure from the query
type TransactionRow = {
  payment_method: string | null;
  source_platform: string | null; // Will be asserted later
  amount: number | null;
};

/**
 * GET handler for fetching revenue aggregated by payment method.
 * Queries the unified_transactions_view and groups results.
 * Supports filtering by date range and source platform.
 *
 * @param {NextRequest} request - The incoming request object.
 * @returns {Promise<NextResponse>} A response containing the payment method revenue breakdown or an error.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // **Corrected client initialization structure AGAIN**
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { // Ensure this is the correct nesting
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
    let query = supabase
      .from('unified_transactions_view' as any) // Assert view name
      .select('payment_method, source_platform, amount')
      .eq('status', 'completed'); // Value type is correct

    // Apply filters
    if (startDate) {
      query = query.gte('transaction_datetime', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_datetime', endDate);
    }
    if (sourcePlatform) {
      query = query.eq('source_platform', sourcePlatform); // Value type is correct
    }

    // Explicitly define expected return type
    const { data: transactions, error } = await query.returns<TransactionRow[]>();

    if (error) {
      console.error('Error fetching transactions for payment method analysis:', error);
      throw error;
    }

    // Aggregate results in Node.js
    const aggregation: Record<string, PaymentMethodRevenue> = {};

    for (const tx of transactions ?? []) {
      // Now tx should be correctly typed as TransactionRow | undefined
      const method = tx.payment_method || 'Unknown';
      const platform = tx.source_platform;
      // Basic check for platform value before using as key/type
      if (platform !== 'xendit' && platform !== 'shopify') continue; // Skip if platform is unexpected

      const key = `${platform}::${method}`; // Unique key

      if (!aggregation[key]) {
        aggregation[key] = {
          payment_method: method,
          source_platform: platform, // platform is now confirmed 'xendit' or 'shopify'
          total_revenue: 0,
          transaction_count: 0,
        };
      }

      aggregation[key].total_revenue += tx.amount ?? 0;
      aggregation[key].transaction_count += 1;
    }

    const paymentMethodRevenue = Object.values(aggregation).sort((a, b) => b.total_revenue - a.total_revenue);

    return NextResponse.json(paymentMethodRevenue);

  } catch (error: any) {
    console.error('[API /revenue/by-payment-method Error]', error);
    return NextResponse.json({ error: 'Failed to fetch revenue by payment method', details: error.message || 'Unknown error' }, { status: 500 });
  }
} 