'use client';

import { useState, useEffect } from 'react';
import {
    getVisitorStats,
    getRecentActivity,
    getConversionStats,
    type VisitorStats,
    type RecentActivityItem,
    type ConversionStats
} from '@/app/actions/analytics-dashboard-actions';
import {
    DailyViewsChart,
    TopSourcesChart,
    TopPagesTable,
    TopLocationsChart,
    DeviceStatsChart,
    OSStatsChart,
    BrowserStatsChart
} from '@/components/analytics/visitor-charts';
import { RecentActivityList } from '@/components/analytics/recent-activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, TrendingUp } from 'lucide-react';

export default function VisitorAnalyticsPage() {
    const [timeRange, setTimeRange] = useState('30days');
    const [stats, setStats] = useState<VisitorStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
    const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                const now = new Date();
                let from = new Date();

                if (timeRange === '7days') {
                    from.setDate(now.getDate() - 7);
                } else if (timeRange === '30days') {
                    from.setDate(now.getDate() - 30);
                } else if (timeRange === '90days') {
                    from.setDate(now.getDate() - 90);
                }

                const [visitorData, activityData, conversionData] = await Promise.all([
                    getVisitorStats({ from, to: now }),
                    getRecentActivity(20),
                    getConversionStats('initiate_checkout', { from, to: now })
                ]);

                setStats(visitorData);
                setRecentActivity(activityData);
                setConversionStats(conversionData);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [timeRange]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Visitor Analytics</h1>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last 3 Months</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : stats ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Key Metrics */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalViews}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.uniqueVisitors}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Avg. Time on Page</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{conversionStats?.conversionRate}%</div>
                                    <p className="text-xs text-muted-foreground">
                                        {conversionStats?.totalConversions} checkouts started
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts */}
                        <div className="grid gap-4 md:grid-cols-1">
                            <DailyViewsChart data={stats.dailyViews} />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <TopSourcesChart data={stats.topSources} />
                            <DeviceStatsChart data={stats.deviceStats} />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <OSStatsChart data={stats.osStats} />
                            <BrowserStatsChart data={stats.browserStats} />
                        </div>

                        <div className="grid gap-4 md:grid-cols-1">
                            <TopLocationsChart data={stats.topLocations} />
                        </div>

                        {/* Tables */}
                        <div className="grid gap-4 md:grid-cols-1">
                            <TopPagesTable data={stats.topPages} />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                        <RecentActivityList data={recentActivity} />
                    </div>
                </div>
            ) : (
                <div className="text-center text-muted-foreground">Failed to load data.</div>
            )}
        </div>
    );
}
