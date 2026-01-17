
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

    // 1. Fetch Visitors (Page Views)
    // Note: We filter by path starting with /p2p-order-form to capture both / and /b rewrites if logged differently,
    // but usually tracking logs the browser URL. Our PageTracker logs 'path' which is usePathname().
    // Middleware rewrite preserves usePathname() as /p2p-order-form usually, BUT we are explicitly
    // logging metadata.variant.

    // A. Visitors for Variant A
    const { data: pvA } = await supabase
        .from("page_views")
        .select("visitor_id")
        .eq('metadata->>variant', 'A')
        .ilike("path", "%p2p-order-form%")

    // B. Visitors for Variant B
    const { data: pvB } = await supabase
        .from("page_views")
        .select("visitor_id")
        .eq('metadata->>variant', 'B')
        .ilike("path", "%p2p-order-form%")

    // 2. Fetch Checkouts (Initiate Checkout Events)
    const { count: checkoutsA } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq('event_name', 'initiate_checkout')
        .eq('event_data->>variant', 'A')

    const { count: checkoutsB } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq('event_name', 'initiate_checkout')
        .eq('event_data->>variant', 'B')

    // 3. Fetch Sales (Transactions)
    // A. Sales for Variant A
    const { data: salesAData } = await supabase
        .from("transactions")
        .select("amount")
        .eq('metadata->>variant', 'A')
        .eq('status', 'completed')
    // Assuming 'completed' is the success status. Adjust if needed (e.g. 'paid').

    const { data: salesBData } = await supabase
        .from("transactions")
        .select("amount")
        .eq('metadata->>variant', 'B')
        .eq('status', 'completed')

    // Calculate Aggregates
    const visitorsCountA = pvA?.length || 0
    const visitorsCountB = pvB?.length || 0

    // Unique Visitors
    // We use a Set to count distinct visitor_ids
    const uniqueVisitorsA = new Set(pvA?.map(p => p.visitor_id).filter(Boolean)).size
    const uniqueVisitorsB = new Set(pvB?.map(p => p.visitor_id).filter(Boolean)).size

    const checkoutCountA = checkoutsA || 0
    const checkoutCountB = checkoutsB || 0

    const salesCountA = salesAData?.length || 0
    const salesCountB = salesBData?.length || 0

    const revenueA = salesAData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0
    const revenueB = salesBData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

    // Calculate Rates (based on Unique Visitors usually, but typically conversion is Sales / Unique Visitors)
    // Rate 1: Interest Rate (Checkout / Unique)
    // Rate 2: Conversion Rate (Sales / Unique)

    const calculateRate = (numerator: number, denominator: number) => {
        return denominator > 0 ? (numerator / denominator) * 100 : 0
    }

    return {
        stats: [
            {
                variant: "A",
                visitors: visitorsCountA,
                uniqueVisitors: uniqueVisitorsA,
                checkouts: checkoutCountA,
                sales: salesCountA,
                checkoutRate: calculateRate(checkoutCountA, uniqueVisitorsA),
                conversionRate: calculateRate(salesCountA, uniqueVisitorsA),
                revenue: revenueA,
            },
            {
                variant: "B",
                visitors: visitorsCountB,
                uniqueVisitors: uniqueVisitorsB,
                checkouts: checkoutCountB,
                sales: salesCountB,
                checkoutRate: calculateRate(checkoutCountB, uniqueVisitorsB),
                conversionRate: calculateRate(salesCountB, uniqueVisitorsB),
                revenue: revenueB,
            },
        ],
        totalVisitors: visitorsCountA + visitorsCountB,
        totalUniqueVisitors: uniqueVisitorsA + uniqueVisitorsB,
        totalSales: salesCountA + salesCountB,
        totalRevenue: revenueA + revenueB,
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
