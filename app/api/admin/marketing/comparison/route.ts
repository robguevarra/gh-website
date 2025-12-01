import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';

const querySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
    const supabase = await createServerSupabaseClient();

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

    try {
        const { data, error } = await supabase.rpc('get_marketing_vs_visitor_stats', {
            start_date: startDate,
            end_date: endDate,
        });

        if (error) {
            console.error('Error fetching marketing comparison:', error);
            return NextResponse.json({ error: 'Failed to fetch comparison data', details: error.message }, { status: 500 });
        }

        return NextResponse.json(data);

    } catch (err) {
        console.error('Unexpected error fetching comparison data:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        return NextResponse.json({ error: 'An unexpected server error occurred', details: errorMessage }, { status: 500 });
    }
}
