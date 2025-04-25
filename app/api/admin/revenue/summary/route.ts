import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Database } from '@/types/supabase';

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().datetime().optional(), // ISO 8601 format
  endDate: z.string().datetime().optional(),   // ISO 8601 format
  sourcePlatform: z.enum(['xendit', 'shopify']).optional(),
  // TODO: Add compareStartDate and compareEndDate for trend calculation
});

// Define the structure of the summary data returned
interface RevenueSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  // TODO: Add trend percentage field (e.g., revenueChangePercentage)
}

/**
 * GET handler for fetching revenue summary metrics.
 * Calculates total revenue, transaction count, and ATV based on the unified view.
 * Supports filtering by date range and source platform.
 *
 * @param {NextRequest} request - The incoming request object.
 * @returns {Promise<NextResponse>} A response containing the revenue summary or an error.
 */
export async function GET(request: NextRequest) {
  // Await the cookies() promise
  const cookieStore = await cookies();

  // Create Supabase client using cookie wrappers
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Now cookieStore is the resolved object
          return cookieStore.get(name)?.value;
        },
        // Set and Remove are needed for auth state persistence, but not strictly required for read-only operations like this GET handler.
        // Include them for completeness if auth might be used.
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Check user authentication and role (assuming middleware/auth checks)
  // Example: const { data: { user }, error: userError } = await supabase.auth.getUser(); ... check role ...

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
    // Define expected type for transactions fetched
    type TransactionRow = { amount: number | null };

    // Use type assertion for the view name as a workaround until types are regenerated
    let query = supabase
      .from('unified_transactions_view' as any) // <-- Type Assertion
      .select('amount', { count: 'exact' })
      .eq('status', 'completed');

    // Apply filters
    if (startDate) {
      query = query.gte('transaction_datetime', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_datetime', endDate);
    }
    if (sourcePlatform) {
      query = query.eq('source_platform', sourcePlatform);
    }

    // Explicitly type the result
    const { data, error, count } = await query.returns<TransactionRow[]>();

    if (error) {
      console.error('Error fetching revenue summary from Supabase:', error);
      throw error;
    }

    const totalTransactions = count ?? 0;
    const totalRevenue = data?.reduce((sum: number, transaction: TransactionRow) => sum + (transaction.amount ?? 0), 0) ?? 0;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // TODO: Implement trend calculation

    const summary: RevenueSummary = {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
    };

    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('[API /revenue/summary Error]', error);
    return NextResponse.json({ error: 'Failed to fetch revenue summary', details: error.message || 'Unknown error' }, { status: 500 });
  } finally {
    // Ensure database mode is set back to safe if it was changed
    // This might be better handled globally or in middleware
    // await default_api.mcp_supabase_live_dangerously({ service: 'database', enable_unsafe_mode: false });
  }
} 