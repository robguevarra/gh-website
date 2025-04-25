import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Database } from '@/types/supabase';

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().datetime(), // Required
  endDate: z.string().datetime(),   // Required
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  sourcePlatform: z.enum(['xendit', 'shopify']).optional(),
});

// Define the structure of the time series data point (matches RPC return type)
interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

/**
 * GET handler for fetching revenue time series data.
 * Aggregates revenue based on the specified granularity (daily, weekly, monthly).
 * Calls the get_revenue_trends RPC function.
 * Supports filtering by date range and source platform.
 *
 * @param {NextRequest} request - The incoming request object.
 * @returns {Promise<NextResponse>} A response containing the revenue trends or an error.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // Correctly structure cookie methods for createServerClient
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
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

  // Auth check would go here

  const searchParams = request.nextUrl.searchParams;
  const parseResult = querySchema.safeParse({
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    granularity: searchParams.get('granularity') ?? 'daily',
    sourcePlatform: searchParams.get('sourcePlatform') ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: parseResult.error.errors }, { status: 400 });
  }

  const { startDate, endDate, granularity, sourcePlatform } = parseResult.data;

  try {
    // Determine the date truncation part for the RPC function
    let dateTruncPart: string;
    switch (granularity) {
      case 'weekly':
        dateTruncPart = 'week';
        break;
      case 'monthly':
        dateTruncPart = 'month';
        break;
      case 'daily':
      default:
        dateTruncPart = 'day';
        break;
    }

    // Prepare parameters for the RPC call
    const rpcParams = {
      p_start_date: startDate,
      p_end_date: endDate,
      p_granularity: dateTruncPart,
      p_source_platform: sourcePlatform, // Pass null if undefined
    };

    // Call the RPC function using type assertion for the name
    const { data, error } = await supabase.rpc('get_revenue_trends' as any, rpcParams);

    if (error) {
      console.error('Error fetching revenue trends from Supabase RPC:', error);
      // Check for specific database errors if needed (e.g., invalid date format from RPC)
      if (error.message.includes('Invalid date format')) {
        return NextResponse.json({ error: 'Invalid date format provided in query parameters.', details: error.message }, { status: 400 });
      }
      if (error.message.includes('Invalid granularity')) {
        return NextResponse.json({ error: 'Invalid granularity specified in query parameters.', details: error.message }, { status: 400 });
      }
      throw error; // Rethrow other errors
    }

    // Assert the data type and default to empty array if null/undefined
    const trends: RevenueTrendPoint[] = (data as RevenueTrendPoint[]) ?? [];

    return NextResponse.json(trends);

  } catch (error: any) {
    console.error('[API /revenue/trends Error]', error);
    return NextResponse.json({ error: 'Failed to fetch revenue trends', details: error.message || 'Unknown error' }, { status: 500 });
  }
} 