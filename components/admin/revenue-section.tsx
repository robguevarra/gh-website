'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from './metric-card';
import { MetricCardSkeleton } from './metric-card-skeleton';
import { DollarSign, Package, ShoppingBag, FileText, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from "react-day-picker";
import { getRevenueBreakdown, getOverviewMetrics, getShopifyProductBreakdown } from '@/app/actions/analytics-actions';
import type { 
  RevenueBreakdown, 
  OverviewMetrics,
  ShopifyProductBreakdown,
  UnifiedAnalyticsOptions, 
  TimeFilter,
  DateRange as AnalyticsDateRange
} from '@/app/actions/analytics-actions';

/**
 * RevenueSection - Database-optimized revenue analytics with RPC functions
 */
export function RevenueSection() {
  // Analytics state
  const [revenueData, setRevenueData] = useState<RevenueBreakdown | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewMetrics | null>(null);
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProductBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
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

  // Helper functions to aggregate data by category
  const getEnrollmentData = () => {
    if (!revenueData) return { count: 0, revenue: 0 };
    
    const enrollmentTypes = ['P2P', 'p2p_course', 'migration_remediation', 'manual_enrollment'];
    let count = 0;
    let revenue = 0;
    
    enrollmentTypes.forEach(type => {
      if (revenueData[type]) {
        count += revenueData[type].count;
        revenue += revenueData[type].revenue;
      }
    });
    
    return { count, revenue };
  };

  const getCanvaData = () => {
    if (!revenueData) return { count: 0, revenue: 0 };
    
    const canvaTypes = ['CANVA', 'Canva', 'canva_ebook'];
    let count = 0;
    let revenue = 0;
    
    canvaTypes.forEach(type => {
      if (revenueData[type]) {
        count += revenueData[type].count;
        revenue += revenueData[type].revenue;
      }
    });
    
    return { count, revenue };
  };

  const getShopifyData = () => {
    if (!revenueData) return { count: 0, revenue: 0 };
    
    const shopifyTypes = ['SHOPIFY_ECOM'];
    let count = 0;
    let revenue = 0;
    
    shopifyTypes.forEach(type => {
      if (revenueData[type]) {
        count += revenueData[type].count;
        revenue += revenueData[type].revenue;
      }
    });
    
    return { count, revenue };
  };

  const getPublicSaleData = () => {
    if (!revenueData) return { count: 0, revenue: 0 };
    
    return revenueData['PUBLIC_SALE'] || { count: 0, revenue: 0 };
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

        const [revenue, overview] = await Promise.all([
          getRevenueBreakdown(options),
          getOverviewMetrics(options)
        ]);
        
        setRevenueData(revenue);
        setOverviewData(overview);

        // Fetch Shopify product breakdown if there are Shopify orders
        if (revenue['SHOPIFY_ECOM']?.count > 0) {
          try {
            const shopifyBreakdown = await getShopifyProductBreakdown(options);
            setShopifyProducts(shopifyBreakdown);
          } catch (shopifyError) {
            console.error('Error fetching Shopify product breakdown:', shopifyError);
            // Continue with main data, just set empty array for products
            setShopifyProducts([]);
          }
        } else {
          setShopifyProducts([]);
        }
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

  const enrollmentData = getEnrollmentData();
  const canvaData = getCanvaData();
  const shopifyData = getShopifyData();
  const publicSaleData = getPublicSaleData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Revenue Analytics</h1>
          <p className="text-muted-foreground">Database-optimized revenue breakdown and performance</p>
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

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading || !overviewData ? (
          Array(3).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              title="Total Revenue"
              value={formatCurrency(overviewData.totalRevenue)}
              description={`${overviewData.totalTransactions} total transactions`}
              intent="revenue"
            />
            <MetricCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              title="Total Enrollments"
              value={overviewData.totalEnrollments.toString()}
              description={formatCurrency(enrollmentData.revenue)}
              intent="info"
            />
            <MetricCard
              icon={<Package className="h-4 w-4 text-muted-foreground" />}
              title="Other Products"
              value={(overviewData.totalTransactions - overviewData.totalEnrollments).toString()}
              description={formatCurrency(overviewData.totalRevenue - enrollmentData.revenue)}
              intent="neutral"
            />
          </>
        )}
      </div>

      {/* Revenue Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))
        ) : (
          <>
            <MetricCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              title="P2P Enrollments"
              value={enrollmentData.count.toString()}
              description={formatCurrency(enrollmentData.revenue)}
              intent="info"
              accent="emerald"
            />
            <MetricCard
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              title="Canva Products"
              value={canvaData.count.toString()}
              description={formatCurrency(canvaData.revenue)}
              intent="neutral"
              accent="violet"
            />
            <MetricCard
              icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
              title="Shopify Orders"
              value={shopifyData.count.toString()}
              description={formatCurrency(shopifyData.revenue)}
              intent="info"
              accent="amber"
            />
            <MetricCard
              icon={<Package className="h-4 w-4 text-muted-foreground" />}
              title="Public Sale"
              value={publicSaleData.count.toString()}
              description={formatCurrency(publicSaleData.revenue)}
              intent="neutral"
              accent="teal"
            />
          </>
        )}
      </div>
      
      {/* Detailed Revenue Breakdown */}
      {!isLoading && revenueData && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Revenue Breakdown</CardTitle>
            <CardDescription>Complete transaction breakdown by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(revenueData)
                .sort(([,a], [,b]) => b.revenue - a.revenue)
                .map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{type}</span>
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatCurrency(data.revenue)}</div>
                      <div className="text-xs text-muted-foreground">{data.count} transactions</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shopify Ecommerce Product Breakdown */}
      {!isLoading && shopifyProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Shopify Ecommerce Product Breakdown</CardTitle>
            <CardDescription>Detailed breakdown of products sold through ecommerce orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shopifyProducts.map((product, index) => (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {product.productName}
                      </h4>
                      <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Qty: {product.totalQuantity}</span>
                        <span>Orders: {product.orderCount}</span>
                        <span>Avg Price: {formatCurrency(product.avgPrice)}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(product.totalRevenue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Summary Footer */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>Total Products: {shopifyProducts.length}</span>
                  <span>
                    Total Revenue: {formatCurrency(shopifyProducts.reduce((sum, p) => sum + p.totalRevenue, 0))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 