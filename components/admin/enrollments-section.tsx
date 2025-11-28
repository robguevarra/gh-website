'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from './metric-card';
import { MetricCardSkeleton } from './metric-card-skeleton';
import { Users, UserPlus, Calendar, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EnrollmentTrendsChart } from './enrollment-trends-chart';
import { getEnrollmentMetrics } from '@/app/actions/analytics-actions';
import type { DateRange } from "react-day-picker";
import { toast } from 'sonner';
import type { 
  EnrollmentMetrics, 
  UnifiedAnalyticsOptions, 
  TimeFilter,
  DateRange as AnalyticsDateRange
} from '@/app/actions/analytics-actions';

// TrendPoint type for the chart
type TrendPoint = { date: string; count?: number };

/**
 * EnrollmentsSection - Simple enrollment analytics showing today and monthly enrollments with trends chart
 */
export function EnrollmentsSection() {
  const [enrollmentMetrics, setEnrollmentMetrics] = useState<EnrollmentMetrics | null>(null);
  const [enrollmentTrends, setEnrollmentTrends] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add error state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month'); // Default to this month for enrollment tracking
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [includeMigrationData, setIncludeMigrationData] = useState(false); // Add migration data toggle

  // Convert react-day-picker DateRange to AnalyticsDateRange
  const convertDateRange = (range: DateRange | undefined): AnalyticsDateRange | undefined => {
    if (!range?.from || !range?.to) return undefined;
    return {
      from: range.from,
      to: range.to
    };
  };

  // Fetch enrollment data from analytics service
  const fetchEnrollmentData = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors

      const options: UnifiedAnalyticsOptions = {
        includeMigrationData, // Use the toggle state like Revenue tab
        timeFilter,
        dateRange: convertDateRange(customDateRange)
      };

      const enrollment = await getEnrollmentMetrics(options);
      setEnrollmentMetrics(enrollment);

      // Extract daily trends from enrollment metrics for the chart
      if (enrollment.enrollmentTrends && enrollment.enrollmentTrends.length > 0) {
        const trends = enrollment.enrollmentTrends.map((trend: { date: string; count: number }) => ({
          date: trend.date,
          count: trend.count
        }));
        setEnrollmentTrends(trends);
      } else {
        setEnrollmentTrends([]);
      }

    } catch (error) {
      console.error('Error fetching enrollment data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load enrollment data'); // Set error state
      toast.error('Failed to load enrollment data');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch data when filters change
  useEffect(() => {
    // Only fetch data if we have a valid configuration
    if (timeFilter === 'custom') {
      // For custom filter, only fetch if we have a valid date range
      if (customDateRange?.from && customDateRange?.to) {
        fetchEnrollmentData();
      }
    } else {
      // For non-custom filters, we can always fetch
      fetchEnrollmentData();
    }
  }, [timeFilter, customDateRange, includeMigrationData]);

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-200 bg-red-50 rounded-md">
        Error loading enrollment data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Enrollment Analytics</h1>
          <p className="text-muted-foreground text-sm md:text-base">P2P Course enrollment tracking and metrics</p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Migration Data Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="enrollment-migration-toggle"
              checked={includeMigrationData}
              onCheckedChange={setIncludeMigrationData}
            />
            <Label htmlFor="enrollment-migration-toggle" className="text-sm">
              Include Migration Data
            </Label>
          </div>
          
          <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range Picker */}
          {timeFilter === 'custom' && (
            <DateRangePicker
              value={customDateRange}
              onChange={setCustomDateRange}
            />
          )}
        </div>
      </div>

      {/* Enrollment Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {isLoading ? (
          Array(2).fill(0).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))
        ) : enrollmentMetrics ? (
          <>
            <MetricCard
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              title="Enrolled Today"
              value={enrollmentMetrics.enrollmentsToday}
              description="New P2P enrollments today"
              intent="info"
              accent="sky"
            />
            <MetricCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              title={timeFilter === 'this_month' ? 'Enrolled This Month' : 'Enrolled In Period'}
              value={timeFilter === 'this_month' ? enrollmentMetrics.enrollmentsThisMonth : enrollmentMetrics.totalEnrollments}
              description={`Total enrollments ${timeFilter === 'custom' ? 'in selected period' : timeFilter.replace('_', ' ')}`}
              intent="info"
              accent="emerald"
            />
          </>
        ) : (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            No enrollment data available
          </div>
        )}
      </div>

      {/* Daily Enrollment Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Enrollment Trends
          </CardTitle>
          <CardDescription>
            Daily enrollment activity for {timeFilter === 'custom' ? 'selected period' : timeFilter.replace('_', ' ')} (new data only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : enrollmentTrends.length > 0 ? (
            <EnrollmentTrendsChart data={enrollmentTrends} granularity="day" />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No enrollment trends data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
} 