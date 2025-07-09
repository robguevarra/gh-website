'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from './metric-card';
import { DollarSign, Package, ShoppingBag, FileText, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from "react-day-picker";
import { getRevenueBreakdown, getOverviewMetrics } from '@/app/actions/analytics-actions';
import type { 
  RevenueBreakdown, 
  UnifiedAnalyticsOptions, 
  TimeFilter,
  DateRange as AnalyticsDateRange
} from '@/app/actions/analytics-actions';

/**
 * RevenueSection - Enhanced revenue analytics with migration data toggle and detailed breakdowns
 */
export function RevenueSection() {
  // Analytics state
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state - as specified by Boss Rob
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');
  const [includeMigrationData, setIncludeMigrationData] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
  };

  // Convert DateRange from react-day-picker to AnalyticsDateRange
  const convertToAnalyticsDateRange = (range: DateRange | undefined): AnalyticsDateRange | undefined => {
    if (!range || !range.from || !range.to) {
      return undefined;
    }
    return {
      from: range.from,
      to: range.to
    };
  };

  // Fetch revenue analytics data
  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const options: UnifiedAnalyticsOptions = {
          timeFilter,
          includeMigrationData,
          dateRange: convertToAnalyticsDateRange(customDateRange),
        };

        const revenue = await getRevenueBreakdown(options);
        
        setRevenueBreakdown(revenue);
      } catch (err: any) {
        console.error('Error fetching revenue data:', err);
        setError(err.message || 'Failed to load revenue data');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch data if we have a valid configuration
    if (timeFilter === 'custom') {
      // For custom filter, only fetch if we have a valid date range
      if (customDateRange?.from && customDateRange?.to) {
        fetchRevenueData();
      }
    } else {
      // For non-custom filters, we can always fetch
      fetchRevenueData();
    }
  }, [timeFilter, includeMigrationData, customDateRange]);

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-200 bg-red-50 rounded-md">
        Error loading revenue data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Revenue Analytics</h1>
          <p className="text-muted-foreground">Comprehensive revenue breakdown and product performance</p>
        </div>
        
        {/* Revenue Analytics Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Migration Data Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="migration-toggle"
              checked={includeMigrationData}
              onCheckedChange={setIncludeMigrationData}
            />
            <Label htmlFor="migration-toggle" className="text-sm">
              Include Migration Data
            </Label>
          </div>
          
          {/* Date Filter Selection */}
          <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
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

      {/* Revenue Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : revenueBreakdown ? (
          <>
            <MetricCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              title="Total Enrollments"
              value={revenueBreakdown.enrollmentCount.toString()}
              description={formatCurrency(revenueBreakdown.totalEnrollmentsRevenue)}
            />
            <MetricCard
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              title="Total Canva"
              value={revenueBreakdown.canvaOrderCount.toString()}
              description={formatCurrency(revenueBreakdown.totalCanvaRevenue)}
            />
            <MetricCard
              icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
              title="Total Shopify Purchases"
              value={revenueBreakdown.shopifyOrderCount.toString()}
              description={formatCurrency(revenueBreakdown.totalShopifyRevenue)}
            />
            <MetricCard
              icon={<Package className="h-4 w-4 text-muted-foreground" />}
              title="Total PUBLIC_SALE Purchases"
              value={revenueBreakdown.publicSaleOrderCount.toString()}
              description={formatCurrency(revenueBreakdown.totalPublicSaleRevenue)}
            />
          </>
        ) : (
          <div className="col-span-4 text-center py-8 text-muted-foreground">
            No revenue data available
          </div>
        )}
      </div>
      
      {/* Revenue Breakdown Details */}
      {!isLoading && revenueBreakdown && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>Detailed revenue by product category with order counts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">P2P Enrollments</span>
                  <span className="text-sm font-bold">{formatCurrency(revenueBreakdown.totalEnrollmentsRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground text-xs">
                  <span>{revenueBreakdown.enrollmentCount} orders</span>
                  <span>Avg: {formatCurrency(revenueBreakdown.enrollmentCount > 0 ? revenueBreakdown.totalEnrollmentsRevenue / revenueBreakdown.enrollmentCount : 0)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Canva Ebooks</span>
                  <span className="text-sm font-bold">{formatCurrency(revenueBreakdown.totalCanvaRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground text-xs">
                  <span>{revenueBreakdown.canvaOrderCount} orders</span>
                  <span>Avg: {formatCurrency(revenueBreakdown.canvaOrderCount > 0 ? revenueBreakdown.totalCanvaRevenue / revenueBreakdown.canvaOrderCount : 0)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Shopify E-commerce</span>
                  <span className="text-sm font-bold">{formatCurrency(revenueBreakdown.totalShopifyRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground text-xs">
                  <span>{revenueBreakdown.shopifyOrderCount} orders</span>
                  <span>Avg: {formatCurrency(revenueBreakdown.shopifyOrderCount > 0 ? revenueBreakdown.totalShopifyRevenue / revenueBreakdown.shopifyOrderCount : 0)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Public Sale</span>
                  <span className="text-sm font-bold">{formatCurrency(revenueBreakdown.totalPublicSaleRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground text-xs">
                  <span>{revenueBreakdown.publicSaleOrderCount} orders</span>
                  <span>Avg: {formatCurrency(revenueBreakdown.publicSaleOrderCount > 0 ? revenueBreakdown.totalPublicSaleRevenue / revenueBreakdown.publicSaleOrderCount : 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Source Information</CardTitle>
              <CardDescription>Current filter settings and data scope</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Data Source</span>
                  <span className="text-sm text-muted-foreground">
                    {includeMigrationData ? 'New + Migrated Data' : 'New Data Only'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Time Period</span>
                  <span className="text-sm text-muted-foreground">
                    {timeFilter === 'custom' ? 'Custom Range' : timeFilter.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Revenue</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(
                      revenueBreakdown.totalEnrollmentsRevenue + 
                      revenueBreakdown.totalCanvaRevenue + 
                      revenueBreakdown.totalShopifyRevenue + 
                      revenueBreakdown.totalPublicSaleRevenue
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shopify Product Breakdown */}
      {!isLoading && shopifyProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Shopify Product Breakdown</CardTitle>
            <CardDescription>Individual product performance and sales data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shopifyProducts.map((product, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{product.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.orderCount} orders • ID: {product.productId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(product.totalSales)}</div>
                    <div className="text-sm text-muted-foreground">
                      Avg: {formatCurrency(product.averageOrderValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 