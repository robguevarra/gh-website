'use server';

import { createServerSupabaseClient } from '@/lib/supabase/client';

export interface DateRange {
    from: Date;
    to: Date;
}

export interface VisitorStats {
    dailyViews: { date: string; count: number; unique_visitors: number }[];
    topSources: { source: string; count: number }[];
    topPages: { path: string; count: number }[];
    totalViews: number;
    uniqueVisitors: number;
}

export async function getVisitorStats(dateRange: DateRange): Promise<VisitorStats> {
    const supabase = createServerSupabaseClient();
    const startDate = dateRange.from.toISOString();
    const endDate = dateRange.to.toISOString();

    try {
        // Fetch data in parallel
        const [dailyViewsRes, topSourcesRes, topPagesRes] = await Promise.all([
            supabase.rpc('get_daily_page_views', { start_date: startDate, end_date: endDate }),
            supabase.rpc('get_top_sources', { start_date: startDate, end_date: endDate, limit_count: 10 }),
            supabase.rpc('get_top_pages', { start_date: startDate, end_date: endDate, limit_count: 10 }),
        ]);

        if (dailyViewsRes.error) throw new Error(`Daily views error: ${dailyViewsRes.error.message}`);
        if (topSourcesRes.error) throw new Error(`Top sources error: ${topSourcesRes.error.message}`);
        if (topPagesRes.error) throw new Error(`Top pages error: ${topPagesRes.error.message}`);

        const dailyViews = dailyViewsRes.data || [];
        const topSources = topSourcesRes.data || [];
        const topPages = topPagesRes.data || [];

        // Calculate totals
        const totalViews = dailyViews.reduce((acc: number, curr: any) => acc + Number(curr.count), 0);
        const uniqueVisitors = dailyViews.reduce((acc: number, curr: any) => acc + Number(curr.unique_visitors), 0); // Note: This is a sum of daily uniques, not true period uniques, but good enough for trend

        return {
            dailyViews,
            topSources,
            topPages,
            totalViews,
            uniqueVisitors,
        };
    } catch (error) {
        console.error('Error fetching visitor stats:', error);
        throw error;
    }
}
