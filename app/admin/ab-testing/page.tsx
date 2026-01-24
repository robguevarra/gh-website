
import { Suspense } from "react"
import { getAdminClient } from "@/lib/supabase/admin"
import { ABTestDashboard } from "@/components/admin/ab-test-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
    title: "A/B Testing | Admin Results",
    description: "View A/B test performance for P2P Order Form",
}

// Revalidate every minute
export const revalidate = 60

async function getABTestStats() {
    const supabase = getAdminClient()

    // 1. Fetch Config to get Start Date
    const { data: configData } = await supabase
        .from('ab_test_config')
        .select('value')
        .eq('key', 'current_test_start_date')
        .single();

    // Default to a fallback if not set (though migration sets it)
    let startDate = configData?.value?.start_date
        ? new Date(configData.value.start_date)
        : (configData?.value // handle if value is just string
            ? new Date(configData.value as unknown as string)
            : null);

    // 2. Call RPC to get accurate stats (server-side counting)
    const { data, error } = await supabase.rpc('get_ab_test_stats', {
        start_date: startDate?.toISOString() || null // Pass null to let RPC handle fallback/config lookup if needed, but explicit is better
    });

    if (error) {
        console.error("Error fetching A/B stats:", error);
        return {
            stats: [],
            totalVisitors: 0,
            totalUniqueVisitors: 0,
            totalSales: 0,
            totalRevenue: 0,
            startDate: startDate?.toISOString() || null
        }
    }

    const result = data as any;
    const statsA = result.stats[0];
    const statsB = result.stats[1];

    // RPC returns raw counts. We need to calculate rates.
    const enrichStats = (s: any) => ({
        ...s,
        checkoutRate: s.uniqueVisitors > 0 ? (s.checkouts / s.uniqueVisitors) * 100 : 0,
        conversionRate: s.uniqueVisitors > 0 ? (s.sales / s.uniqueVisitors) * 100 : 0
    });

    const enrichedStats = [enrichStats(statsA), enrichStats(statsB)];

    // 3. Fetch History
    const { data: historyData } = await supabase
        .from('ab_test_history')
        .select('*')
        .order('snapshot_date', { ascending: false });

    return {
        stats: enrichedStats,
        history: historyData || [],
        totalVisitors: (statsA?.visitors || 0) + (statsB?.visitors || 0),
        totalUniqueVisitors: (statsA?.uniqueVisitors || 0) + (statsB?.uniqueVisitors || 0),
        totalSales: (statsA?.sales || 0) + (statsB?.sales || 0),
        totalRevenue: (statsA?.revenue || 0) + (statsB?.revenue || 0),
        startDate: result.meta?.start_date || startDate?.toISOString()
    }
}

export default async function ABTestPage() {
    const data = await getABTestStats()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">A/B Testing Results</h2>
            </div>

            <div className="space-y-4">
                <Card className="bg-blue-50/50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-blue-800 text-lg">Active Test: Pay Per Order Form</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-blue-600">
                            Current Status: <span className="font-bold">{process.env.NEXT_PUBLIC_AB_TEST_STATUS || 'RUNNING'}</span>
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                            Displaying real-time stats for Variant A (Control) vs Variant B (Test).
                        </p>
                    </CardContent>
                </Card>

                <Suspense fallback={<div>Loading stats...</div>}>
                    <ABTestDashboard {...data} />
                </Suspense>
            </div>
        </div>
    )
}
