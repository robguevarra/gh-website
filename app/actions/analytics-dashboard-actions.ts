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
    topLocations: { location: string; count: number }[];
    deviceStats: { device: string; count: number }[];
    avgDuration: number;
    totalViews: number;
    uniqueVisitors: number;
}

export async function getVisitorStats(dateRange: DateRange): Promise<VisitorStats> {
    const supabase = createServerSupabaseClient();
    const startDate = dateRange.from.toISOString();
    const endDate = dateRange.to.toISOString();

    try {
        // Fetch data in parallel
        const [dailyViewsRes, topSourcesRes, topPagesRes, topLocationsRes, deviceStatsRes, avgDurationRes] = await Promise.all([
            supabase.rpc('get_daily_page_views' as any, { start_date: startDate, end_date: endDate }),
            supabase.rpc('get_top_sources' as any, { start_date: startDate, end_date: endDate, limit_count: 10 }),
            supabase.rpc('get_top_pages' as any, { start_date: startDate, end_date: endDate, limit_count: 10 }),
            supabase.rpc('get_top_locations' as any, { start_date: startDate, end_date: endDate, limit_count: 10 }),
            supabase.rpc('get_device_stats' as any, { start_date: startDate, end_date: endDate }),
            supabase.rpc('get_avg_duration' as any, { start_date: startDate, end_date: endDate }),
        ]);

        if (dailyViewsRes.error) throw new Error(`Daily views error: ${dailyViewsRes.error.message}`);
        if (topSourcesRes.error) throw new Error(`Top sources error: ${topSourcesRes.error.message}`);
        if (topPagesRes.error) throw new Error(`Top pages error: ${topPagesRes.error.message}`);
        if (topLocationsRes.error) throw new Error(`Top locations error: ${topLocationsRes.error.message}`);
        if (deviceStatsRes.error) throw new Error(`Device stats error: ${deviceStatsRes.error.message}`);
        if (avgDurationRes.error) throw new Error(`Average duration error: ${avgDurationRes.error.message}`);

        const dailyViews = (dailyViewsRes.data || []) as any[];
        const topSources = (topSourcesRes.data || []) as any[];
        const topPages = (topPagesRes.data || []) as any[];
        const topLocations = (topLocationsRes.data || []) as any[];
        const deviceStats = (deviceStatsRes.data || []) as any[];
        const avgDuration = (avgDurationRes.data || 0) as number;

        // Calculate totals
        const totalViews = dailyViews.reduce((acc: number, curr: any) => acc + Number(curr.count), 0);
        const uniqueVisitors = dailyViews.reduce((acc: number, curr: any) => acc + Number(curr.unique_visitors), 0);

        return {
            dailyViews,
            topSources,
            topPages,
            topLocations,
            deviceStats,
            avgDuration,
            totalViews,
            uniqueVisitors,
        };
    } catch (error) {
        console.error('Error fetching visitor stats:', error);
        throw error;
    }
}
