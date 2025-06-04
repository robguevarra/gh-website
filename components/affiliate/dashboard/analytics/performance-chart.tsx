'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon } from 'lucide-react';
import { useAffiliateMetricsData } from '@/lib/hooks/use-affiliate-dashboard';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps as RechartsTooltipProps
} from 'recharts';
import { Button } from '@/components/ui/button';
import { format, subDays, subWeeks, subMonths, parseISO } from 'date-fns';

// Type definitions for our chart data
type TimeRange = '7d' | '30d' | '90d';
type MetricType = 'clicks' | 'conversions' | 'earnings';

// Sample data structure (replace with actual data from API)
interface DailyMetric {
  date: string;
  clicks: number;
  conversions: number;
  earnings: number;
}

// Generate sample data for the chart
const generateSampleData = (timeRange: TimeRange): DailyMetric[] => {
  const today = new Date();
  let days: number;
  
  switch (timeRange) {
    case '7d':
      days = 7;
      break;
    case '30d':
      days = 30;
      break;
    case '90d':
      days = 90;
      break;
    default:
      days = 30;
  }
  
  const baseClicks = 20;
  const baseConversions = 2;
  const baseEarnings = 50;
  
  return Array.from({ length: days }).map((_, index) => {
    const date = subDays(today, days - 1 - index);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Generate some random variation to make the chart interesting
    const randomFactor = 0.5 + Math.random();
    const weekendFactor = [0, 6].includes(date.getDay()) ? 0.8 : 1.2; // Less activity on weekends
    
    const clicks = Math.round(baseClicks * randomFactor * weekendFactor);
    const conversions = Math.round(baseConversions * randomFactor * weekendFactor);
    const earnings = Math.round(baseEarnings * randomFactor * weekendFactor);
    
    return {
      date: dateStr,
      clicks,
      conversions,
      earnings
    };
  });
};

// Custom tooltip component for the charts
const CustomTooltip = ({ active, payload, label, metricType }: RechartsTooltipProps<number, string> & { metricType: MetricType }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value as number;
    let formattedValue: string | number = value;
    
    // Format the value based on metric type
    if (metricType === 'earnings') {
      formattedValue = `$${value.toFixed(2)}`;
    }
    
    return (
      <div className="bg-white p-2 border shadow-sm rounded-md text-sm">
        <p className="font-medium">{format(parseISO(label), 'MMM d, yyyy')}</p>
        <p className="text-muted-foreground">{
          metricType.charAt(0).toUpperCase() + metricType.slice(1)
        }: <span className="font-medium">{formattedValue}</span></p>
      </div>
    );
  }
  
  return null;
};

export function PerformanceChart() {
  const [metricType, setMetricType] = useState<MetricType>('clicks');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const { metrics, isLoadingMetrics, loadAffiliateMetrics } = useAffiliateMetricsData();
  
  // Generate sample data for the chart - replace with API data in production
  const [chartData, setChartData] = useState<DailyMetric[]>([]);
  
  useEffect(() => {
    // Load affiliate metrics with the selected timeframe
    loadAffiliateMetrics(timeRange);
    
    // Generate sample data for the chart
    setChartData(generateSampleData(timeRange));
  }, [timeRange, loadAffiliateMetrics]);

  // Helper function to get the chart title based on metric type
  const getChartTitle = () => {
    switch (metricType) {
      case 'clicks':
        return 'Click Activity Over Time';
      case 'conversions':
        return 'Conversion Activity Over Time';
      case 'earnings':
        return 'Earnings Over Time';
      default:
        return 'Performance Metrics';
    }
  };
  
  // Get color based on metric type
  const getMetricColor = () => {
    switch (metricType) {
      case 'clicks':
        return '#9ac5d9'; // Blue from the color palette
      case 'conversions':
        return '#b08ba5'; // Purple from the color palette
      case 'earnings':
        return '#4caf50'; // Green for earnings
      default:
        return '#9ac5d9';
    }
  };
  
  // Format the Y axis ticks based on metric type
  const formatYAxisTick = (value: number) => {
    if (metricType === 'earnings') {
      return `$${value}`;
    }
    return value.toString();
  };
  
  // Format the X axis ticks to show dates in a more readable format
  const formatXAxisTick = (dateStr: string) => {
    return format(parseISO(dateStr), 'MMM d');
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>{getChartTitle()}</CardTitle>
          <CardDescription>
            Visualize your performance metrics over time
          </CardDescription>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex space-x-2">
            <Select
              value={metricType}
              onValueChange={(value) => setMetricType(value as MetricType)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="conversions">Conversions</SelectItem>
                <SelectItem value="earnings">Earnings</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={chartType}
              onValueChange={(value) => setChartType(value as 'line' | 'bar')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90 Days
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingMetrics ? (
          <div className="space-y-3">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : (
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxisTick}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={formatYAxisTick}
                    tick={{ fontSize: 12 }}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip metricType={metricType} />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={metricType}
                    name={metricType.charAt(0).toUpperCase() + metricType.slice(1)}
                    stroke={getMetricColor()}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxisTick}
                    tick={{ fontSize: 12 }}
                    interval={timeRange === '90d' ? 6 : timeRange === '30d' ? 2 : 0}
                  />
                  <YAxis
                    tickFormatter={formatYAxisTick}
                    tick={{ fontSize: 12 }}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip metricType={metricType} />} />
                  <Legend />
                  <Bar
                    dataKey={metricType}
                    name={metricType.charAt(0).toUpperCase() + metricType.slice(1)}
                    fill={getMetricColor()}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
            <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
              <InfoIcon className="h-3 w-3 mr-1" />
              <span>This is sample data for visualization purposes. Connect to your analytics API for real data.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
