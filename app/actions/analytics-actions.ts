'use server';

import { createServerSupabaseClient } from '@/lib/supabase/client';

export type DateRange = {
  from: Date;
  to: Date;
};

export type TimeFilter = 'today' | 'this_month' | 'last_3_months' | 'custom';

export interface UnifiedAnalyticsOptions {
  includeMigrationData: boolean;
  timeFilter: TimeFilter;
  dateRange?: DateRange;
}

export interface OverviewMetrics {
  totalRevenue: number;
  totalEnrollments: number;
  totalTransactions: number;
  totalCanvaOrders: number;
  totalShopifyOrders: number;
  totalPublicSaleOrders: number;
}

export interface EnrollmentMetrics {
  totalEnrollments: number;
  enrollmentsToday: number;
  enrollmentsThisMonth: number;
  enrollmentTrends: Array<{ date: string; count: number }>;
}

export interface RevenueBreakdown {
  [key: string]: {
    count: number;
    revenue: number;
  };
}

export interface ShopifyProductBreakdown {
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
  avgPrice: number;
}

// Helper function to get date range from time filter
function getDateRange(timeFilter: TimeFilter, customRange?: DateRange): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (timeFilter) {
    case 'today':
      return {
        from: today,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    case 'this_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      };
    case 'last_3_months':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      };
    case 'custom':
      if (!customRange) {
        throw new Error('Custom date range required when timeFilter is "custom"');
      }
      return customRange;
    default:
      throw new Error(`Unknown time filter: ${timeFilter}`);
  }
}

// Server action to get revenue breakdown using database RPC
export async function getRevenueBreakdown(options: UnifiedAnalyticsOptions): Promise<RevenueBreakdown> {
  const supabase = createServerSupabaseClient();
  const dateRange = getDateRange(options.timeFilter, options.dateRange);

  try {
    const { data, error } = await supabase.rpc('get_revenue_breakdown' as any, {
      start_date: dateRange.from.toISOString(),
      end_date: dateRange.to.toISOString(),
      include_migration_data: options.includeMigrationData
    }) as { data: any[] | null; error: any };

    if (error) {
      console.error('Revenue breakdown RPC error:', error);
      throw new Error(`Failed to get revenue breakdown: ${error.message}`);
    }

    // Transform database result to expected format
    const breakdown: RevenueBreakdown = {};
    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        breakdown[row.transaction_type] = {
          count: Number(row.transaction_count),
          revenue: Number(row.total_revenue)
        };
      });
    }

    return breakdown;
  } catch (error) {
    console.error('Error in getRevenueBreakdown:', error);
    throw error;
  }
}

// Server action to get enrollment metrics using database RPC
export async function getEnrollmentMetrics(options: UnifiedAnalyticsOptions): Promise<EnrollmentMetrics> {
  const supabase = createServerSupabaseClient();
  const dateRange = getDateRange(options.timeFilter, options.dateRange);

  try {
    const { data, error } = await supabase.rpc('get_enrollment_metrics' as any, {
      start_date: dateRange.from.toISOString(),
      end_date: dateRange.to.toISOString(),
      include_migration_data: options.includeMigrationData
    }) as { data: any[] | null; error: any };

    if (error) {
      console.error('Enrollment metrics RPC error:', error);
      throw new Error(`Failed to get enrollment metrics: ${error.message}`);
    }

    const result = data && Array.isArray(data) ? data[0] : null;
    if (!result) {
      throw new Error('No enrollment metrics data returned');
    }

    // The enrollment trends come already parsed from the RPC function
    const enrollmentTrends = result.enrollment_trends || [];

    return {
      totalEnrollments: Number(result.total_enrollments) || 0,
      enrollmentsToday: Number(result.enrollments_today) || 0,
      enrollmentsThisMonth: Number(result.enrollments_this_month) || 0,
      enrollmentTrends: enrollmentTrends
    };
  } catch (error) {
    console.error('Error in getEnrollmentMetrics:', error);
    throw error;
  }
}

// Server action to get overview metrics using database RPC
export async function getOverviewMetrics(options: UnifiedAnalyticsOptions): Promise<OverviewMetrics> {
  const supabase = createServerSupabaseClient();
  const dateRange = getDateRange(options.timeFilter, options.dateRange);

  try {
    const { data, error } = await supabase.rpc('get_overview_metrics' as any, {
      start_date: dateRange.from.toISOString(),
      end_date: dateRange.to.toISOString(),
      include_migration_data: options.includeMigrationData
    }) as { data: any[] | null; error: any };

    if (error) {
      console.error('Overview metrics RPC error:', error);
      throw new Error(`Failed to get overview metrics: ${error.message}`);
    }

    const result = data && Array.isArray(data) ? data[0] : null;
    if (!result) {
      throw new Error('No overview metrics data returned');
    }

    return {
      totalRevenue: Number(result.total_revenue) || 0,
      totalEnrollments: Number(result.total_enrollments) || 0,
      totalTransactions: Number(result.total_transactions) || 0,
      totalCanvaOrders: Number(result.total_canva_orders) || 0,
      totalShopifyOrders: Number(result.total_shopify_orders) || 0,
      totalPublicSaleOrders: Number(result.total_public_sale_orders) || 0
    };
  } catch (error) {
    console.error('Error in getOverviewMetrics:', error);
    throw error;
  }
} 

// Server action to get detailed Shopify ecommerce product breakdown
export async function getShopifyProductBreakdown(options: UnifiedAnalyticsOptions): Promise<ShopifyProductBreakdown[]> {
  const supabase = createServerSupabaseClient();
  const dateRange = getDateRange(options.timeFilter, options.dateRange);

  try {
    const { data, error } = await supabase
      .from('ecommerce_orders')
      .select(`
        id,
        order_status,
        created_at,
        ecommerce_order_items (
          quantity,
          price_at_purchase,
          shopify_products (
            title
          )
        )
      `)
      .eq('order_status', 'completed')
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString());

    if (error) {
      console.error('Shopify product breakdown error:', error);
      throw new Error(`Failed to get Shopify product breakdown: ${error.message}`);
    }

    // Process the data to create product breakdown
    const productMap = new Map<string, {
      totalQuantity: number;
      totalRevenue: number;
      orderCount: Set<string>;
      prices: number[];
    }>();

    data?.forEach(order => {
      order.ecommerce_order_items.forEach(item => {
        const productName = item.shopify_products?.title || 'Unknown Product';
        const existing = productMap.get(productName) || {
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: new Set(),
          prices: []
        };

        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.quantity * Number(item.price_at_purchase);
        existing.orderCount.add(order.id);
        existing.prices.push(Number(item.price_at_purchase));

        productMap.set(productName, existing);
      });
    });

    // Convert to final format and sort by revenue
    const breakdown: ShopifyProductBreakdown[] = Array.from(productMap.entries())
      .map(([productName, data]) => ({
        productName,
        totalQuantity: data.totalQuantity,
        totalRevenue: data.totalRevenue,
        orderCount: data.orderCount.size,
        avgPrice: data.prices.reduce((sum, price) => sum + price, 0) / data.prices.length
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return breakdown;
  } catch (error) {
    console.error('Error in getShopifyProductBreakdown:', error);
    throw error;
  }
} 