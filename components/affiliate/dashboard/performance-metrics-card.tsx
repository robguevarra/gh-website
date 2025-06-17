'use client';

import { useState } from 'react';
import { LineChart, BarChart3, TrendingUp, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAffiliateMetricsData } from '@/lib/hooks/use-affiliate-dashboard';
import { formatCurrencyPHP } from '@/lib/utils/formatting';

export function PerformanceMetricsCard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const { 
    metrics, 
    isLoadingMetrics, 
    loadAffiliateMetrics
  } = useAffiliateMetricsData();

  const handleRefresh = () => {
    loadAffiliateMetrics(timeRange);
  };

  // Display placeholder text for empty metrics
  const displayMetricValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString();
  };

  // Calculate conversion rate
  const conversionRate = metrics?.totalClicks && metrics.totalClicks > 0
    ? ((metrics.totalConversions / metrics.totalClicks) * 100).toFixed(2)
    : '0.00';

  // Calculate earnings per click
  const earningsPerClick = metrics?.totalClicks && metrics.totalClicks > 0
    ? (metrics.totalEarnings / metrics.totalClicks).toFixed(2)
    : '0.00';

  const formatLastUpdated = () => {
    if (!metrics?.lastUpdated) return 'Never updated';
    
    const now = new Date();
    const updated = new Date(metrics.lastUpdated);
    const diffMinutes = Math.round((now.getTime() - updated.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Performance Metrics</CardTitle>
          <CardDescription>Track your affiliate performance</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as '7d' | '30d' | '90d' | 'all')}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Time Period</SelectLabel>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" onClick={handleRefresh} disabled={isLoadingMetrics}>
            <RefreshCcw className={`h-4 w-4 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">Total Clicks</span>
              <div className="mt-1 flex items-center">
                <BarChart3 className="mr-2 h-4 w-4 text-blue-500" />
                <span className="text-2xl font-semibold">
                  {displayMetricValue(metrics?.totalClicks)}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">Conversions</span>
              <div className="mt-1 flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-2xl font-semibold">
                  {displayMetricValue(metrics?.totalConversions)}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">Conversion Rate</span>
              <div className="mt-1 flex items-center">
                <LineChart className="mr-2 h-4 w-4 text-purple-500" />
                <span className="text-2xl font-semibold">{conversionRate}%</span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">Total Earnings</span>
              <div className="mt-1 flex items-center">
                <span className="text-2xl font-semibold text-green-600">
                  {formatCurrencyPHP(metrics?.totalEarnings) || '₱0.00'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t flex justify-between items-center text-xs text-muted-foreground">
        <div>Last updated: {formatLastUpdated()}</div>
        <div>Avg. earnings per click: {formatCurrencyPHP(parseFloat(earningsPerClick))}</div>
      </CardFooter>
    </Card>
  );
}
