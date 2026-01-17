"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, ShoppingCart, CreditCard, TrendingUp, AlertCircle } from "lucide-react"

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
}

export function ABTestDashboard({
    stats,
    totalVisitors,
    totalUniqueVisitors,
    totalSales,
    totalRevenue
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

    return (
        <div className="space-y-6">
            {/* Top Level Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            AVG Order Value: {totalSales > 0 ? formatCurrency(totalRevenue / totalSales) : 0}
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
        </div>
    )
}
