'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from './metric-card';
import { ChartContainer } from './chart-container';
import { DataTable } from './data-table';
import { FilterDropdown } from './filter-dropdown';
import { DollarSign, Package, TrendingUp, Users, ShoppingBag, Calendar } from 'lucide-react';
import { useSharedDashboardFiltersStore } from '@/lib/stores/admin/sharedDashboardFiltersStore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type EnhancedRevenueMetrics = {
  summary: {
    totalRevenue: number;
    totalP2PEnrollments: number;
    totalCanvaEbooks: number;
    todayCanvaEbooks: number;
    monthlyCanvaEbooks: number;
    totalTransactions: number;
  };
  revenueByProduct: Array<{
    product_type: string;
    platform: string;
    total_revenue: number;
    transaction_count: number;
  }>;
  topShopifyProducts: Array<{
    title: string;
    total_revenue: number;
    total_quantity: number;
    order_count: number;
  }>;
  recentPurchases: Array<{
    transaction_id: string;
    amount: number;
    product_type: string;
    platform: string;
    transaction_date: string;
    contact_email: string;
  }>;
  canvaEbookPurchases: Array<{
    email: string;
    name: string;
    created_at: string;
  }>;
};

/**
 * RevenueSection - Enhanced revenue analytics with P2P enrollments, Canva ebook sales, and Shopify product revenue.
 * Shows informative metrics about business performance.
 */
export function RevenueSection() {
  const { dateRange } = useSharedDashboardFiltersStore();
  const [productFilter, setProductFilter] = useState('all');
  const [data, setData] = useState<EnhancedRevenueMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
  };

  // Fetch enhanced revenue metrics data
  useEffect(() => {
    const fetchRevenueMetrics = async () => {
      if (!dateRange?.from) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.append('startDate', dateRange.from.toISOString());
        const endDate = dateRange.to || dateRange.from;
        params.append('endDate', endDate.toISOString());

        const response = await fetch(`/api/admin/dashboard/enhanced-revenue-metrics?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch revenue metrics (${response.status})`);
        }
        
        const result: EnhancedRevenueMetrics = await response.json();
        setData(result);
      } catch (err: any) {
        console.error('Error fetching revenue metrics:', err);
        setError(err.message || 'Failed to load revenue metrics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueMetrics();
  }, [dateRange]);

  // Filter data based on selected product
  const filteredRevenueBreakdown = data?.revenueByProduct.filter(item => 
    productFilter === 'all' || item.product_type.toLowerCase().includes(productFilter.toLowerCase())
  ) || [];

  // Prepare recent purchases table data
  const recentPurchasesColumns = [
    { header: 'Product', accessor: 'product_type' },
    { header: 'Amount', accessor: 'amountFormatted' },
    { header: 'Platform', accessor: 'platform' },
    { header: 'Date', accessor: 'dateFormatted' },
    { header: 'Customer', accessor: 'contact_email' },
  ];
  
  const recentPurchasesData = (data?.recentPurchases || []).map(item => ({
    ...item,
    amountFormatted: formatCurrency(item.amount),
    dateFormatted: item.transaction_date ? format(new Date(item.transaction_date), 'PPp') : '-',
  }));

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-200 bg-red-50 rounded-md">
        Error loading revenue data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : (
          <>
            <MetricCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              title="P2P Enrollments"
              value={data?.summary.totalP2PEnrollments || 0}
              description="People who enrolled"
            />
            <MetricCard
              icon={<Package className="h-4 w-4 text-muted-foreground" />}
              title="Canva Ebook Sales"
              value={data?.summary.totalCanvaEbooks || 0}
              description={`${data?.summary.todayCanvaEbooks || 0} today, ${data?.summary.monthlyCanvaEbooks || 0} this month`}
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              title="Total Revenue"
              value={data ? formatCurrency(data.summary.totalRevenue) : '₱0'}
              description={`${data?.summary.totalTransactions || 0} transactions`}
            />
            <MetricCard
              icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
              title="Avg Order Value"
              value={data && data.summary.totalTransactions > 0 ? 
                formatCurrency(data.summary.totalRevenue / data.summary.totalTransactions) : '₱0'}
              description="Per transaction"
            />
            <MetricCard
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              title="Today's Canva Sales"
              value={data?.summary.todayCanvaEbooks || 0}
              description="Ebook purchases today"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              title="Monthly Canva Sales"
              value={data?.summary.monthlyCanvaEbooks || 0}
              description="Ebook purchases this month"
            />
          </>
        )}
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <FilterDropdown
          label="Product Filter"
          value={productFilter}
          onChange={setProductFilter}
          options={[
            { label: 'All Products', value: 'all' },
            { label: 'Papers to Profits', value: 'p2p' },
            { label: 'Canva Ebook', value: 'canva' },
            { label: 'Shopify Products', value: 'shopify' },
            { label: 'Ecommerce', value: 'ecommerce' },
          ]}
        />
      </div>
      
      {/* Revenue by Product Type */}
      <ChartContainer title="Revenue Breakdown by Product">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !filteredRevenueBreakdown.length ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredRevenueBreakdown.map((product, idx) => (
              <div key={idx} className="text-center p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-lg">{product.product_type}</h4>
                <p className="text-sm text-muted-foreground">{product.platform}</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(product.total_revenue)}</p>
                <p className="text-sm text-muted-foreground">
                  {product.transaction_count} transactions
                </p>
              </div>
            ))}
          </div>
        )}
      </ChartContainer>

      {/* Top Shopify Products */}
      {data?.topShopifyProducts.length ? (
        <ChartContainer title="Top Grossing Shopify Products">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {data.topShopifyProducts.slice(0, 6).map((product, idx) => (
              <div key={idx} className="text-center p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-lg">{product.title}</h4>
                <p className="text-2xl font-bold text-primary">{formatCurrency(product.total_revenue)}</p>
                <p className="text-sm text-muted-foreground">
                  {product.total_quantity} units sold in {product.order_count} orders
                </p>
              </div>
            ))}
          </div>
        </ChartContainer>
      ) : null}
      
      {/* Recent Purchases Table */}
      <DataTable 
        columns={recentPurchasesColumns} 
        data={recentPurchasesData} 
        emptyState={
          <span>
            {isLoading ? 'Loading...' : 'No recent purchases found.'}
          </span>
        } 
      />
    </div>
  );
} 