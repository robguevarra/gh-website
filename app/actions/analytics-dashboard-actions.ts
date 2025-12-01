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
    topCities: { city: string; country: string; count: number }[];
    deviceStats: { device: string; count: number }[];
    osStats: { os: string; count: number }[];
    browserStats: { browser: string; count: number }[];
    avgDuration: number;
    bounceRate: number;
    totalViews: number;
    uniqueVisitors: number;
}

export async function getVisitorStats(dateRange: DateRange): Promise<VisitorStats> {
    const supabase = createServerSupabaseClient();
    const startDate = dateRange.from.toISOString();
    const endDate = dateRange.to.toISOString();

    try {
        // Fetch data in parallel
        const [
            dailyViewsRes,
            topSourcesRes,
            topPagesRes,
            topLocationsRes,
            topCitiesRes,
            deviceStatsRes,
            osStatsRes,
            browserStatsRes,
            avgDurationRes,
            bounceRateRes
        ] = await Promise.all([
            supabase.rpc('get_daily_page_views' as any, { start_date: startDate, end_date: endDate }),
            supabase.rpc('get_top_sources' as any, { start_date: startDate, end_date: endDate, limit_count: 10 }),
            supabase.rpc('get_top_pages' as any, { start_date: startDate, end_date: endDate, limit_count: 10 }),
            supabase.rpc('get_top_locations' as any, { start_date: startDate, end_date: endDate, limit_count: 10 }),
            supabase.rpc('get_top_cities' as any, { start_date: startDate, end_date: endDate, limit_count: 10 }),
            supabase.rpc('get_device_stats' as any, { start_date: startDate, end_date: endDate }),
            supabase.rpc('get_os_stats' as any, { start_date: startDate, end_date: endDate }),
            supabase.rpc('get_browser_stats' as any, { start_date: startDate, end_date: endDate }),
            supabase.rpc('get_avg_duration' as any, { start_date: startDate, end_date: endDate }),
            supabase.rpc('get_bounce_rate' as any, { start_date: startDate, end_date: endDate }),
        ]);

        if (dailyViewsRes.error) throw new Error(`Daily views error: ${dailyViewsRes.error.message}`);
        if (topSourcesRes.error) throw new Error(`Top sources error: ${topSourcesRes.error.message}`);
        if (topPagesRes.error) throw new Error(`Top pages error: ${topPagesRes.error.message}`);
        if (topLocationsRes.error) throw new Error(`Top locations error: ${topLocationsRes.error.message}`);
        if (topCitiesRes.error) throw new Error(`Top cities error: ${topCitiesRes.error.message}`);
        if (deviceStatsRes.error) throw new Error(`Device stats error: ${deviceStatsRes.error.message}`);
        if (osStatsRes.error) throw new Error(`OS stats error: ${osStatsRes.error.message}`);
        if (browserStatsRes.error) throw new Error(`Browser stats error: ${browserStatsRes.error.message}`);
        if (avgDurationRes.error) throw new Error(`Average duration error: ${avgDurationRes.error.message}`);
        if (bounceRateRes.error) throw new Error(`Bounce rate error: ${bounceRateRes.error.message}`);

        const dailyViews = (dailyViewsRes.data || []) as any[];
        const topSources = (topSourcesRes.data || []) as any[];
        const topPages = (topPagesRes.data || []) as any[];

        // Decode location data
        const topLocations = ((topLocationsRes.data || []) as any[]).map((item: any) => ({
            ...item,
            location: decodeURIComponent(item.location)
        }));

        const topCities = ((topCitiesRes.data || []) as any[]).map((item: any) => ({
            ...item,
            city: decodeURIComponent(item.city),
            country: decodeURIComponent(item.country)
        }));

        const deviceStats = (deviceStatsRes.data || []) as any[];
        const osStats = (osStatsRes.data || []) as any[];
        const browserStats = (browserStatsRes.data || []) as any[];
        const avgDuration = (avgDurationRes.data || 0) as number;
        const bounceRate = (bounceRateRes.data || 0) as number;

        // Calculate totals
        const totalViews = dailyViews.reduce((acc: number, curr: any) => acc + Number(curr.count), 0);
        const uniqueVisitors = dailyViews.reduce((acc: number, curr: any) => acc + Number(curr.unique_visitors), 0);

        return {
            dailyViews,
            topSources,
            topPages,
            topLocations,
            topCities,
            deviceStats,
            osStats,
            browserStats,
            avgDuration,
            bounceRate,
            totalViews,
            uniqueVisitors,
        };
    } catch (error) {
        console.error('Error fetching visitor stats:', error);
        throw error;
    }
}

export interface RecentActivityItem {
    type: 'view' | 'event';
    id: string;
    created_at: string;
    details: {
        url?: string;
        path?: string;
        event_name?: string;
        event_data?: any;
        city?: string;
        country?: string;
    };
}

export async function getRecentActivity(limit: number = 20): Promise<RecentActivityItem[]> {
    const supabase = createServerSupabaseClient();

    try {
        const { data, error } = await supabase.rpc('get_recent_activity' as any, { limit_count: limit });

        if (error) throw error;

        // Decode city and country in details
        const decodedData = (data || []).map((item: any) => ({
            ...item,
            details: {
                ...item.details,
                city: item.details.city ? decodeURIComponent(item.details.city) : undefined,
                country: item.details.country ? decodeURIComponent(item.details.country) : undefined,
            }
        }));

        return decodedData as RecentActivityItem[];
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        return [];
    }
}

export interface ConversionStats {
    totalVisitors: number;
    totalConversions: number;
    conversionRate: number;
}

export async function getConversionStats(eventName: string, dateRange: DateRange): Promise<ConversionStats> {
    const supabase = createServerSupabaseClient();
    const startDate = dateRange.from.toISOString();
    const endDate = dateRange.to.toISOString();

    try {
        const { data, error } = await supabase.rpc('get_conversion_stats' as any, {
            target_event_name: eventName,
            start_date: startDate,
            end_date: endDate
        });

        if (error) throw error;

        const result = (data && data[0]) ? data[0] : { total_visitors: 0, total_conversions: 0, conversion_rate: 0 };

        return {
            totalVisitors: Number(result.total_visitors),
            totalConversions: Number(result.total_conversions),
            conversionRate: Number(result.conversion_rate)
        };
    } catch (error) {
        console.error('Error fetching conversion stats:', error);
        return { totalVisitors: 0, totalConversions: 0, conversionRate: 0 };
    }
}
