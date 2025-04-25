import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server'; // Use project's server client helper
import { validateAdminStatus } from '@/lib/supabase/admin'; // Use project's admin check helper
import { Database } from '@/types/supabase';

// Define the schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(), // ISO 8601 date string
  endDate: z.string().optional(), // ISO 8601 date string
});

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient(); // Initialize client using helper

  // 1. Check admin authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdminUser = await validateAdminStatus(user.id);
  if (!isAdminUser) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // 2. Get and validate query parameters
  const { searchParams } = new URL(request.url);
  const validationResult = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: validationResult.error.errors }, { status: 400 });
  }

  const { startDate, endDate } = validationResult.data;

  // 3. Fetch data
  try {
    // Base query to calculate total ad spend
    let query = supabase
      .from('ad_spend')
      .select('spend', { count: 'exact', head: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching marketing summary:', error);
      return NextResponse.json({ error: 'Failed to fetch marketing summary', details: error.message }, { status: 500 });
    }

    // Calculate total spend
    const totalAdSpend = data?.reduce((sum: number, record: { spend: number | null }) => sum + (record.spend || 0), 0) || 0;

    // Prepare summary data
    const summary = {
      totalAdSpend: totalAdSpend.toFixed(2),
      totalAttributedRevenue: null, // Blocked by ad attribution
      overallROAS: null, // Blocked by ad attribution
      averageCPA: null, // Blocked by ad attribution
    };

    return NextResponse.json(summary);

  } catch (err) {
    console.error('Unexpected error fetching marketing summary:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'An unexpected server error occurred', details: errorMessage }, { status: 500 });
  }
}

// Basic security measure: disallow other methods
export async function POST() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
export async function PATCH() {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
} 