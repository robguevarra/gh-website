"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, UserPlus, Activity, ChevronLeft, ChevronRight, ShoppingCart, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCard } from './metric-card';
import { getOverviewMetrics } from '@/app/actions/analytics-actions';
import type { 
  OverviewMetrics, 
  UnifiedAnalyticsOptions, 
  TimeFilter,
  DateRange as AnalyticsDateRange
} from '@/app/actions/analytics-actions';

export function DashboardOverview() {
  // State management for the overview analytics
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const options: UnifiedAnalyticsOptions = {
        timeFilter,
        includeMigrationData: false, // Overview excludes migration data by default
        dateRange: undefined, // Use timeFilter instead of custom range for overview
      };

      const overview = await getOverviewMetrics(options);
      setOverviewMetrics(overview);
    } catch (err: any) {
      console.error('Error fetching overview analytics:', err);
      setError(err.message || 'Failed to load overview data');
      toast.error(err.message || 'Failed to load overview data');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch data when filters change
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeFilter]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
  };

  if (error) {
    return <div className="p-4 text-red-600 border border-red-200 bg-red-50 rounded-md">Error loading overview: {error}</div>;
  }

  if (isLoading || !overviewMetrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Business Overview</h1>
          <p className="text-muted-foreground text-sm md:text-base">Key metrics and performance indicators</p>
        </div>
        
        {/* Simple time filter for overview */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Metric Cards - Clean and Mobile-Optimized */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          icon={<span className="h-4 w-4 text-muted-foreground font-bold">₱</span>}
          title="Total Revenue"
          value={formatCurrency(overviewMetrics.totalRevenue)}
          description={`Period: ${timeFilter.replace('_', ' ')}`}
        />
        <MetricCard
          icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
          title="Total Enrollees"
          value={overviewMetrics.totalEnrollments.toString()}
          description="P2P Course Students"
        />
        <MetricCard
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          title="Canva Ebook Orders"
          value={overviewMetrics.totalCanvaOrders.toString()}
          description="Digital Ebook Sales"
        />
        <MetricCard
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          title="Shopify Orders"
          value={overviewMetrics.totalShopifyOrders.toString()}
          description="E-commerce Sales"
        />
        <MetricCard
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          title="Public Sale Orders"
          value={overviewMetrics.totalPublicSaleOrders.toString()}
          description="Pillow Talk License"
        />
      </div>
    </div>
  );
} 