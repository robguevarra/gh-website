"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, ShoppingCart, CreditCard, TrendingUp, AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { snapshotAndResetStats } from "@/app/admin/ab-testing/actions"
import * as React from "react"

interface ABTestStats {
    variant: string
    visitors: number
    uniqueVisitors: number
    checkouts: number
    sales: number
    checkoutRate: number
    conversionRate: number
    revenue: number
}

interface ABTestDashboardProps {
    stats: ABTestStats[]
    totalVisitors: number
    totalUniqueVisitors: number
    totalSales: number
    totalRevenue: number
    history: any[]
}

export function ABTestDashboard({
    stats,
    totalVisitors,
    totalUniqueVisitors,
    totalSales,
    totalRevenue,
    history
}: ABTestDashboardProps) {

    // Safe formatting for currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // Safe formatting for percentages
    const formatPercent = (val: number) => `${val.toFixed(2)}%`;

    // Calculate lift (relative improvement of B over A)
    const statsA = stats.find(s => s.variant === 'A');
    const statsB = stats.find(s => s.variant === 'B');

    const conversionLift = statsA && statsB && statsA.conversionRate > 0
        ? ((statsB.conversionRate - statsA.conversionRate) / statsA.conversionRate) * 100
        : 0;

    // State for reset dialog
    const [isResetOpen, setIsResetOpen] = React.useState(false)
    const [resetDescription, setResetDescription] = React.useState("")
    const [isResetting, setIsResetting] = React.useState(false)

    const handleReset = async () => {
        if (!resetDescription) return
        setIsResetting(true)
        try {
            await snapshotAndResetStats(resetDescription)
            setIsResetOpen(false)
            setResetDescription("")
        } catch (error) {
            console.error("Failed to reset:", error)
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header with Reset Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium leading-none">Current Test Performance</h3>
                    <p className="text-sm text-muted-foreground">
                        Real-time data since last reset
                    </p>
                </div>

                <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Snapshot & Reset Test
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reset A/B Test Stats?</DialogTitle>
                            <DialogDescription>
                                This will archive the current statistics to history and reset all counts to zero.
                                This cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Snapshot Description / Name</Label>
                                <Input
                                    placeholder="e.g. 'Test Run 1: Original vs Bold Header'"
                                    value={resetDescription}
                                    onChange={(e) => setResetDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsResetOpen(false)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={handleReset}
                                disabled={!resetDescription || isResetting}
                            >
                                {isResetting ? "Resetting..." : "Confirm Reset"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Top Level Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* ... existing cards ... */}
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Unique Visitors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{totalUniqueVisitors.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {totalVisitors.toLocaleString()} total page views
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            AVG Order Value: {totalSales > 0 ? formatCurrency(totalRevenue / totalSales) : formatCurrency(0)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{totalSales.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className={`${conversionLift > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'} shadow-sm`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">B vs A Impact</CardTitle>
                        <TrendingUp className={`h-4 w-4 ${conversionLift > 0 ? 'text-green-600' : 'text-slate-400'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${conversionLift > 0 ? 'text-green-700' : 'text-slate-900'}`}>
                            {conversionLift > 0 ? '+' : ''}{conversionLift.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Relative Conversion Lift
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6 md:grid-cols-7">
                {/* ... existing table and charts ... */}
                {/* Funnel & Detailed Stats Table */}
                <Card className="col-span-4 shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle>Funnel Performance</CardTitle>
                        <CardDescription>Breakdown of user journey from visit to purchase.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Metric</th>
                                        <th className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                Variant A <Badge variant="outline" className="text-xs">Control</Badge>
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 rounded-tr-lg">
                                            <div className="flex items-center gap-2">
                                                Variant B <Badge className="bg-brand-purple text-xs">Test</Badge>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* Row 1: Visitors */}
                                    <tr className="bg-white">
                                        <td className="px-4 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-slate-400" />
                                                Unique Visitors
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">{statsA?.uniqueVisitors.toLocaleString()}</td>
                                        <td className="px-4 py-4 font-semibold">{statsB?.uniqueVisitors.toLocaleString()}</td>
                                    </tr>

                                    {/* Row 2: Checkouts */}
                                    <tr className="bg-white">
                                        <td className="px-4 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart className="w-4 h-4 text-slate-400" />
                                                Checkout Attempts
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {statsA?.checkouts.toLocaleString()}
                                            <span className="text-xs text-slate-400 ml-2">({formatPercent(statsA?.checkoutRate || 0)})</span>
                                        </td>
                                        <td className="px-4 py-4 font-semibold">
                                            {statsB?.checkouts.toLocaleString()}
                                            <span className="text-xs text-slate-400 ml-2">({formatPercent(statsB?.checkoutRate || 0)})</span>
                                        </td>
                                    </tr>

                                    {/* Row 3: Sales */}
                                    <tr className="bg-white">
                                        <td className="px-4 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-slate-400" />
                                                Completed Orders
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {statsA?.sales.toLocaleString()}
                                            <span className="text-xs text-slate-400 ml-2">({formatPercent(statsA?.conversionRate || 0)})</span>
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-green-600">
                                            {statsB?.sales.toLocaleString()}
                                            <span className="text-xs text-slate-400 ml-2">({formatPercent(statsB?.conversionRate || 0)})</span>
                                        </td>
                                    </tr>

                                    {/* Row 4: Revenue */}
                                    <tr className="bg-slate-50/50">
                                        <td className="px-4 py-4 font-medium text-slate-900">
                                            Total Revenue
                                        </td>
                                        <td className="px-4 py-4 font-mono text-slate-600">
                                            {formatCurrency(statsA?.revenue || 0)}
                                        </td>
                                        <td className="px-4 py-4 font-mono font-bold text-slate-900">
                                            {formatCurrency(statsB?.revenue || 0)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Charts */}
                <Card className="col-span-3 shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle>Conversion Rate Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="variant" axisLine={false} tickLine={false} />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Conversion Rate']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="conversionRate"
                                    fill="currentColor"
                                    radius={[4, 4, 0, 0]}
                                    className="fill-brand-purple"
                                    barSize={60}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 text-sm text-slate-500 text-center">
                            Higher is better. Variant B is {(statsB?.conversionRate || 0) > (statsA?.conversionRate || 0) ? 'winning' : 'trailing'}.
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* History Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Test History</h3>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle>Previous Test Runs</CardTitle>
                        <CardDescription>Snapshots of previous A/B testing cycles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {history && history.length > 0 ? (
                            <div className="relative overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3">Date / Name</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 text-right">Visitors (A/B)</th>
                                            <th className="px-4 py-3 text-right">Sales (A/B)</th>
                                            <th className="px-4 py-3 text-right">Improvement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {history.map((item) => {
                                            const statsData = item.stats.stats; // Access the nested stats array
                                            const statsA = statsData?.[0];
                                            const statsB = statsData?.[1];

                                            // Calculate lift locally for display if available
                                            const convA = statsA && statsA.uniqueVisitors > 0 ? (statsA.sales / statsA.uniqueVisitors) : 0;
                                            const convB = statsB && statsB.uniqueVisitors > 0 ? (statsB.sales / statsB.uniqueVisitors) : 0;
                                            const lift = convA > 0 ? ((convB - convA) / convA) * 100 : 0;

                                            return (
                                                <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-4 font-medium text-slate-900">
                                                        <div>{new Date(item.snapshot_date).toLocaleDateString()}</div>
                                                        <div className="text-xs text-slate-500">{new Date(item.snapshot_date).toLocaleTimeString()}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-slate-600">{item.description || 'No description'}</td>
                                                    <td className="px-4 py-4 text-right font-mono">
                                                        {statsA?.uniqueVisitors}/{statsB?.uniqueVisitors}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-mono">
                                                        {statsA?.sales}/{statsB?.sales}
                                                    </td>
                                                    <td className={`px-4 py-4 text-right font-bold ${lift > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                                        {lift > 0 ? '+' : ''}{lift.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                No history available. Reset stats to create a snapshot.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
