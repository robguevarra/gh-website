"use client";

import { createClient } from '../../supabase/client';
import { Database } from '../../../types/supabase';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type EnrollmentRow = Database['public']['Tables']['enrollments']['Row'];
type EcommerceOrderRow = Database['public']['Tables']['ecommerce_orders']['Row'];
type ShopifyOrderRow = Database['public']['Tables']['shopify_orders']['Row'];
// Note: public_sale_orders type will be available after regenerating Supabase types

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
  totalEnrollees: number;
  totalCanvaOrders: number;
  totalShopifyOrders: number;
  totalPublicSaleOrders: number;
}

export interface EnrollmentMetrics {
  // Basic enrollment counts
  enrolledToday: number;
  enrolledThisMonth: number;
  enrolledInPeriod: number;
  previousPeriodEnrollments: number;
  trendPercentage: number | null;
  
  // Enrollment trends
  enrollmentTrend: Array<{ date: string; count: number }>;
  
  // Enrollment by source
  todayBySource: Array<{
    acquisition_source: string;
    enrollments_today: number;
  }>;
  monthlyBySource: Array<{
    acquisition_source: string;
    enrollments_this_month: number;
  }>;
  periodBySource: Array<{
    acquisition_source: string;
    enrollments_in_period: number;
  }>;
  
  // Recent enrollments with user details
  recentEnrollments: Array<{
    enrollment_id: string;
    enrolled_at: string;
    status: string;
    user_id: string;
    email: string;
    userName: string;
    acquisition_source: string;
    course_title: string;
    course_id: string;
  }>;
  
  // Status breakdown
  statusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface RevenueBreakdown {
  totalEnrollmentsRevenue: number;
  totalCanvaRevenue: number;
  totalShopifyRevenue: number;
  totalPublicSaleRevenue: number;
  enrollmentCount: number;
  canvaOrderCount: number;
  shopifyOrderCount: number;
  publicSaleOrderCount: number;
}

export interface ShopifyProductBreakdown {
  productId: string;
  productName: string;
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
}

/**
 * Unified Analytics Service
 * Provides comprehensive analytics data for the admin dashboard
 */
export class UnifiedAnalyticsService {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Get date range based on time filter
   */
  private getDateRange(timeFilter: TimeFilter, customRange?: DateRange): DateRange {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThreeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    switch (timeFilter) {
      case 'today':
        return {
          from: startOfToday,
          to: now
        };
      case 'this_month':
        return {
          from: startOfMonth,
          to: now
        };
      case 'last_3_months':
        return {
          from: startOfThreeMonthsAgo,
          to: now
        };
      case 'custom':
        if (!customRange) {
          throw new Error('Custom date range required when timeFilter is "custom"');
        }
        return customRange;
      default:
        return {
          from: startOfMonth,
          to: now
        };
    }
  }

  /**
   * Build transaction status filter conditions
   */
  private getTransactionStatusFilter(includeMigrationData: boolean): string[] {
    if (includeMigrationData) {
      // Include both new and migrated data
      return ['paid', 'success', 'SUCCEEDED', 'succeeded'];
    } else {
      // Only new data
      return ['paid'];
    }
  }

  /**
   * Get Overview Metrics
   * Returns aggregated metrics for the overview tab
   */
  async getOverviewMetrics(options: UnifiedAnalyticsOptions): Promise<OverviewMetrics> {
    const dateRange = this.getDateRange(options.timeFilter, options.dateRange);
    const statusFilter = this.getTransactionStatusFilter(options.includeMigrationData);

    try {
      // DEBUG: Log the overview metrics query parameters
      console.log('🔍 DEBUG - Overview Metrics Query Parameters:', {
        timeFilter: options.timeFilter,
        includeMigrationData: options.includeMigrationData,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        statusFilter
      });

      // Get total revenue from transactions
      const { data: revenueData, error: revenueError } = await this.supabase
        .from('transactions')
        .select('amount, transaction_type')
        .in('status', statusFilter)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .limit(20000);

      // DEBUG: Log the overview query result
      console.log('🔍 DEBUG - Overview Query Result with 20000 LIMIT:', {
        recordCount: revenueData?.length || 0,
        error: revenueError,
        limitApplied: '20000'
      });

      if (revenueError) throw revenueError;

      // Calculate revenue and counts by transaction type
      let totalRevenue = 0;
      let enrollmentRevenue = 0;
      let enrollmentCount = 0; // Count transactions, not enrollment records
      let canvaOrders = 0;
      let canvaRevenue = 0;
      let shopifyOrders = 0;
      let shopifyRevenue = 0;
      let publicSaleOrders = 0;
      let publicSaleRevenue = 0;

      revenueData?.forEach((transaction: { amount: number | string | null; transaction_type: string | null }) => {
        const amount = Number(transaction.amount) || 0;
        totalRevenue += amount;

        // Categorize by transaction type
        switch (transaction.transaction_type) {
          case 'P2P':
          case 'p2p_course':
          case 'migration_remediation':
          case 'manual_enrollment':
            enrollmentRevenue += amount;
            enrollmentCount++; // Count each transaction as an enrollment
            break;
          case 'CANVA':
          case 'Canva':
          case 'canva_ebook':
            canvaOrders++;
            canvaRevenue += amount;
            break;
          case 'SHOPIFY_ECOM':
            shopifyOrders++;
            shopifyRevenue += amount;
            break;
          case 'PUBLIC_SALE':
            publicSaleOrders++;
            publicSaleRevenue += amount;
            break;
        }
      });

      // Get Shopify legacy orders if including migration data
      let legacyShopifyOrders = 0;
      let legacyShopifyRevenue = 0;

      if (options.includeMigrationData) {
        const { data: shopifyData, error: shopifyError } = await this.supabase
          .from('shopify_orders')
          .select('total_price')
          .eq('financial_status', 'paid')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .limit(5000);

        if (shopifyError) throw shopifyError;

        legacyShopifyOrders = shopifyData?.length || 0;
        legacyShopifyRevenue = shopifyData?.reduce((sum: number, order: { total_price: number | string | null }) => 
          sum + (Number(order.total_price) || 0), 0) || 0;
      }

      // Get new ecommerce orders count
      const { data: ecommerceData, error: ecommerceError } = await this.supabase
        .from('ecommerce_orders')
        .select('total_amount', { count: 'exact' })
        .eq('order_status', 'completed')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .limit(5000);

      if (ecommerceError) throw ecommerceError;

      const newEcommerceOrders = ecommerceData?.length || 0;
      const newEcommerceRevenue = ecommerceData?.reduce((sum: number, order: { total_amount: number | string | null }) => 
        sum + (Number(order.total_amount) || 0), 0) || 0;

      return {
        totalRevenue: totalRevenue + legacyShopifyRevenue + newEcommerceRevenue,
        totalEnrollees: enrollmentCount, // Now consistent with Revenue tab logic
        totalCanvaOrders: canvaOrders,
        totalShopifyOrders: shopifyOrders + legacyShopifyOrders + newEcommerceOrders,
        totalPublicSaleOrders: publicSaleOrders
      };

    } catch (error) {
      console.error('Error fetching overview metrics:', error);
      throw new Error(`Failed to fetch overview metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Enhanced Enrollment Metrics
   * Returns comprehensive enrollment statistics for all enrollment-related components
   */
  async getEnrollmentMetrics(options: UnifiedAnalyticsOptions): Promise<EnrollmentMetrics> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const dateRange = this.getDateRange(options.timeFilter, options.dateRange);

    try {
      // Get transaction status filter for consistent data filtering
      const statusFilter = this.getTransactionStatusFilter(options.includeMigrationData);

      // Basic enrollment counts - today (filtered by transaction status)
      const { count: enrolledToday, error: todayError } = await this.supabase
        .from('enrollments')
        .select('*, transactions!inner(status)', { count: 'exact', head: true })
        .gte('enrolled_at', startOfToday.toISOString())
        .lte('enrolled_at', now.toISOString())
        .in('transactions.status', statusFilter);

      if (todayError) throw todayError;

      // Basic enrollment counts - this month (filtered by transaction status)
      const { count: enrolledThisMonth, error: monthError } = await this.supabase
        .from('enrollments')
        .select('*, transactions!inner(status)', { count: 'exact', head: true })
        .gte('enrolled_at', startOfMonth.toISOString())
        .lte('enrolled_at', now.toISOString())
        .in('transactions.status', statusFilter);

      if (monthError) throw monthError;

      // Enrollments in selected period (filtered by transaction status)
      const { count: enrolledInPeriod, error: periodError } = await this.supabase
        .from('enrollments')
        .select('*, transactions!inner(status)', { count: 'exact', head: true })
        .gte('enrolled_at', dateRange.from.toISOString())
        .lte('enrolled_at', dateRange.to.toISOString())
        .in('transactions.status', statusFilter);

      if (periodError) throw periodError;

      // Previous period for trend calculation (filtered by transaction status)
      const previousPeriodRange = this.getPreviousPeriodRange(dateRange);
      const { count: previousPeriodEnrollments, error: prevError } = await this.supabase
        .from('enrollments')
        .select('*, transactions!inner(status)', { count: 'exact', head: true })
        .gte('enrolled_at', previousPeriodRange.from.toISOString())
        .lte('enrolled_at', previousPeriodRange.to.toISOString())
        .in('transactions.status', statusFilter);

      if (prevError) throw prevError;

      // Calculate trend percentage
      const trendPercentage = this.calculatePercentageChange(enrolledInPeriod || 0, previousPeriodEnrollments || 0);

      // Get enrollments with user details for today (by source) - filtered by transaction status
      const { data: todayEnrollmentsData, error: todaySourceError } = await this.supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          unified_profiles(acquisition_source),
          transactions!inner(status)
        `)
        .gte('enrolled_at', startOfToday.toISOString())
        .lte('enrolled_at', now.toISOString())
        .in('transactions.status', statusFilter);

      if (todaySourceError) throw todaySourceError;

      // Get enrollments with user details for this month (by source) - filtered by transaction status
      const { data: monthlyEnrollmentsData, error: monthlySourceError } = await this.supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          unified_profiles(acquisition_source),
          transactions!inner(status)
        `)
        .gte('enrolled_at', startOfMonth.toISOString())
        .lte('enrolled_at', now.toISOString())
        .in('transactions.status', statusFilter);

      if (monthlySourceError) throw monthlySourceError;

      // Get enrollments with user details for selected period (by source) - filtered by transaction status
      const { data: periodEnrollmentsData, error: periodSourceError } = await this.supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          unified_profiles(acquisition_source),
          transactions!inner(status)
        `)
        .gte('enrolled_at', dateRange.from.toISOString())
        .lte('enrolled_at', dateRange.to.toISOString())
        .in('transactions.status', statusFilter);

      if (periodSourceError) throw periodSourceError;

      // Get recent enrollments with full details - filtered by transaction status
      const { data: recentEnrollmentsData, error: recentError } = await this.supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          status,
          unified_profiles(id, email, first_name, last_name, acquisition_source),
          courses(id, title),
          transactions!inner(status)
        `)
        .gte('enrolled_at', dateRange.from.toISOString())
        .lte('enrolled_at', dateRange.to.toISOString())
        .in('transactions.status', statusFilter)
        .order('enrolled_at', { ascending: false })
        .limit(50);

      if (recentError) throw recentError;

      // Get status breakdown for the period - filtered by transaction status
      const { data: statusData, error: statusError } = await this.supabase
        .from('enrollments')
        .select('status, transactions!inner(status)')
        .gte('enrolled_at', dateRange.from.toISOString())
        .lte('enrolled_at', dateRange.to.toISOString())
        .in('transactions.status', statusFilter)
        .limit(10000);

      if (statusError) throw statusError;

      // Process enrollment trends (daily for the selected date range)
      // For enrollment trends, we need to filter by transaction data to respect migration settings
      // Get enrollments with their transaction data to filter out migration data if needed
      let trendQuery = this.supabase
        .from('enrollments')
        .select(`
          enrolled_at,
          transactions!inner(status)
        `)
        .gte('enrolled_at', dateRange.from.toISOString())
        .lte('enrolled_at', dateRange.to.toISOString())
        .order('enrolled_at', { ascending: true })
        .limit(10000);

      // Apply transaction status filter to match migration data setting
      trendQuery = trendQuery.in('transactions.status', statusFilter);

      const { data: trendData, error: trendError } = await trendQuery;

      if (trendError) throw trendError;

      // All queries now consistently filter by transaction status

      // Removed debug logs - issue was 1000 record limit, now fixed

      // Group enrollment data by source
      const todayBySource = this.groupEnrollmentsBySourceToday(todayEnrollmentsData || []);
      const monthlyBySource = this.groupEnrollmentsBySourceMonthly(monthlyEnrollmentsData || []);
      const periodBySource = this.groupEnrollmentsBySourcePeriod(periodEnrollmentsData || []);

      // Process recent enrollments data
      const recentEnrollments = (recentEnrollmentsData || []).map((enrollment: any) => {
        // Handle Supabase joins - both unified_profiles and courses are arrays
        const profile = enrollment.unified_profiles?.[0];
        const course = enrollment.courses?.[0];
        
        return {
          enrollment_id: enrollment.id,
          enrolled_at: enrollment.enrolled_at,
          status: enrollment.status,
          user_id: profile?.id || '',
          email: profile?.email || '',
          userName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.id || '',
          acquisition_source: profile?.acquisition_source || 'unknown',
          course_title: course?.title || 'Unknown Course',
          course_id: course?.id || ''
        };
      });

      // Process status breakdown
      const statusBreakdown = this.groupEnrollmentsByStatus(statusData || [], enrolledInPeriod || 0);

      // Group enrollments by date for trends
      const enrollmentTrend = this.groupEnrollmentsByDate(trendData || []);

      return {
        enrolledToday: enrolledToday || 0,
        enrolledThisMonth: enrolledThisMonth || 0,
        enrolledInPeriod: enrolledInPeriod || 0,
        previousPeriodEnrollments: previousPeriodEnrollments || 0,
        trendPercentage,
        enrollmentTrend,
        todayBySource,
        monthlyBySource,
        periodBySource,
        recentEnrollments,
        statusBreakdown
      };

    } catch (error) {
      console.error('Error fetching enrollment metrics:', error);
      throw new Error(`Failed to fetch enrollment metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Revenue Breakdown
   * Returns detailed revenue analysis for the revenue tab
   */
  async getRevenueBreakdown(options: UnifiedAnalyticsOptions): Promise<RevenueBreakdown> {
    const dateRange = this.getDateRange(options.timeFilter, options.dateRange);
    const statusFilter = this.getTransactionStatusFilter(options.includeMigrationData);

    try {
      // DEBUG: Log the actual query parameters
      console.log('🔍 DEBUG - Revenue Breakdown Query Parameters:', {
        timeFilter: options.timeFilter,
        includeMigrationData: options.includeMigrationData,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        statusFilter
      });

      // Get transactions breakdown
      const { data: transactionData, error: transactionError } = await this.supabase
        .from('transactions')
        .select('amount, transaction_type')
        .in('status', statusFilter)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .limit(20000);

      // DEBUG: Log the query result
      console.log('🔍 DEBUG - Revenue Query Result with 20000 LIMIT:', {
        recordCount: transactionData?.length || 0,
        error: transactionError,
        limitApplied: '20000'
      });

      if (transactionError) throw transactionError;

      // Calculate breakdown by category
      let enrollmentRevenue = 0;
      let enrollmentCount = 0;
      let canvaRevenue = 0;
      let canvaCount = 0;
      let shopifyRevenue = 0;
      let shopifyCount = 0;
      let publicSaleRevenue = 0;
      let publicSaleCount = 0;

      transactionData?.forEach((transaction: { amount: number | string | null; transaction_type: string | null }) => {
        const amount = Number(transaction.amount) || 0;

        switch (transaction.transaction_type) {
          case 'P2P':
          case 'p2p_course':
          case 'migration_remediation':
          case 'manual_enrollment':
            enrollmentRevenue += amount;
            enrollmentCount++;
            break;
          case 'CANVA':
          case 'Canva':
          case 'canva_ebook':
            canvaRevenue += amount;
            canvaCount++;
            break;
          case 'SHOPIFY_ECOM':
            shopifyRevenue += amount;
            shopifyCount++;
            break;
          case 'PUBLIC_SALE':
            publicSaleRevenue += amount;
            publicSaleCount++;
            break;
        }
      });

      // Add legacy Shopify data if including migration data
      if (options.includeMigrationData) {
        const { data: shopifyData, error: shopifyError } = await this.supabase
          .from('shopify_orders')
          .select('total_price')
          .eq('financial_status', 'paid')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .limit(5000);

        if (shopifyError) throw shopifyError;

        const legacyShopifyRevenue = shopifyData?.reduce((sum: number, order: { total_price: number | string | null }) => 
          sum + (Number(order.total_price) || 0), 0) || 0;
        shopifyRevenue += legacyShopifyRevenue;
        shopifyCount += shopifyData?.length || 0;
      }

      // Add new ecommerce orders
      const { data: ecommerceData, error: ecommerceError } = await this.supabase
        .from('ecommerce_orders')
        .select('total_amount')
        .eq('order_status', 'completed')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .limit(5000);

      if (ecommerceError) throw ecommerceError;

      const newEcommerceRevenue = ecommerceData?.reduce((sum: number, order: { total_amount: number | string | null }) => 
        sum + (Number(order.total_amount) || 0), 0) || 0;
      shopifyRevenue += newEcommerceRevenue;
      shopifyCount += ecommerceData?.length || 0;

      return {
        totalEnrollmentsRevenue: enrollmentRevenue,
        totalCanvaRevenue: canvaRevenue,
        totalShopifyRevenue: shopifyRevenue,
        totalPublicSaleRevenue: publicSaleRevenue,
        enrollmentCount,
        canvaOrderCount: canvaCount,
        shopifyOrderCount: shopifyCount,
        publicSaleOrderCount: publicSaleCount
      };

    } catch (error) {
      console.error('Error fetching revenue breakdown:', error);
      throw new Error(`Failed to fetch revenue breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Shopify Product Breakdown
   * Returns detailed product-level analysis for Shopify sales
   */
  async getShopifyProductBreakdown(options: UnifiedAnalyticsOptions): Promise<ShopifyProductBreakdown[]> {
    const dateRange = this.getDateRange(options.timeFilter, options.dateRange);

    try {
      // Get new ecommerce order items with product details
      const { data: orderItemsData, error: orderItemsError } = await this.supabase
        .from('ecommerce_order_items')
        .select(`
          quantity,
          price_at_purchase,
          product_snapshot,
          product_id,
          order_id,
          ecommerce_orders!inner (
            order_status,
            created_at
          ),
          shopify_products (
            title,
            handle
          )
        `)
        .eq('ecommerce_orders.order_status', 'completed')
        .gte('ecommerce_orders.created_at', dateRange.from.toISOString())
        .lte('ecommerce_orders.created_at', dateRange.to.toISOString());

      if (orderItemsError) throw orderItemsError;

      // Aggregate product data
      const productMap = new Map<string, {
        name: string;
        totalSales: number;
        orderCount: number;
        quantities: number[];
      }>();

      orderItemsData?.forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.shopify_products?.title || 
                          item.product_snapshot?.title || 
                          `Product ${productId}`;
        const itemTotal = Number(item.price_at_purchase) * Number(item.quantity);

        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.totalSales += itemTotal;
          existing.orderCount += 1;
          existing.quantities.push(Number(item.quantity));
        } else {
          productMap.set(productId, {
            name: productName,
            totalSales: itemTotal,
            orderCount: 1,
            quantities: [Number(item.quantity)]
          });
        }
      });

      // Convert to array and calculate averages
      const productBreakdown: ShopifyProductBreakdown[] = Array.from(productMap.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          totalSales: data.totalSales,
          orderCount: data.orderCount,
          averageOrderValue: data.totalSales / data.orderCount
        }))
        .sort((a, b) => b.totalSales - a.totalSales);

      return productBreakdown;

    } catch (error) {
      console.error('Error fetching Shopify product breakdown:', error);
      throw new Error(`Failed to fetch product breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Group enrollments by date for trend analysis
   */
  private groupEnrollmentsByDate(enrollments: Array<{ enrolled_at: string; transactions?: any }>): Array<{ date: string; count: number }> {
    const groupedData = new Map<string, number>();
    
    enrollments.forEach(enrollment => {
      const date = new Date(enrollment.enrolled_at).toISOString().split('T')[0];
      groupedData.set(date, (groupedData.get(date) || 0) + 1);
    });

    const result = Array.from(groupedData.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return result;
  }

  /**
   * Helper method to calculate previous period range for trend analysis
   */
  private getPreviousPeriodRange(currentRange: DateRange): DateRange {
    const duration = currentRange.to.getTime() - currentRange.from.getTime();
    const previousEnd = new Date(currentRange.from.getTime() - 1); // Day before start
    const previousStart = new Date(previousEnd.getTime() - duration);
    
    return {
      from: previousStart,
      to: previousEnd
    };
  }

  /**
   * Helper method to group enrollments by acquisition source for today's data
   */
  private groupEnrollmentsBySourceToday(enrollments: Array<{ unified_profiles: Array<{ acquisition_source: string | null }> }>): Array<{ acquisition_source: string; enrollments_today: number }> {
    const sourceMap = new Map<string, number>();
    
    enrollments.forEach(enrollment => {
      // Handle Supabase join - unified_profiles is an array, take first element
      const profile = enrollment.unified_profiles?.[0];
      const source = profile?.acquisition_source || 'unknown';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    
    return Array.from(sourceMap.entries()).map(([source, count]) => ({
      acquisition_source: source,
      enrollments_today: count
    })).sort((a, b) => b.enrollments_today - a.enrollments_today);
  }

  /**
   * Helper method to group enrollments by acquisition source for this month's data
   */
  private groupEnrollmentsBySourceMonthly(enrollments: Array<{ unified_profiles: Array<{ acquisition_source: string | null }> }>): Array<{ acquisition_source: string; enrollments_this_month: number }> {
    const sourceMap = new Map<string, number>();
    
    enrollments.forEach(enrollment => {
      // Handle Supabase join - unified_profiles is an array, take first element
      const profile = enrollment.unified_profiles?.[0];
      const source = profile?.acquisition_source || 'unknown';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    
    return Array.from(sourceMap.entries()).map(([source, count]) => ({
      acquisition_source: source,
      enrollments_this_month: count
    })).sort((a, b) => b.enrollments_this_month - a.enrollments_this_month);
  }

  /**
   * Helper method to group enrollments by acquisition source for the selected period's data
   */
  private groupEnrollmentsBySourcePeriod(enrollments: Array<{ unified_profiles: Array<{ acquisition_source: string | null }> }>): Array<{ acquisition_source: string; enrollments_in_period: number }> {
    const sourceMap = new Map<string, number>();
    
    enrollments.forEach(enrollment => {
      // Handle Supabase join - unified_profiles is an array, take first element
      const profile = enrollment.unified_profiles?.[0];
      const source = profile?.acquisition_source || 'unknown';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    
    return Array.from(sourceMap.entries()).map(([source, count]) => ({
      acquisition_source: source,
      enrollments_in_period: count
    })).sort((a, b) => b.enrollments_in_period - a.enrollments_in_period);
  }

  /**
   * Helper method to group enrollments by status
   */
  private groupEnrollmentsByStatus(enrollments: Array<{ status: string }>, totalCount: number): Array<{ status: string; count: number; percentage: number }> {
    const statusMap = new Map<string, number>();
    
    enrollments.forEach(enrollment => {
      const status = enrollment.status || 'unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    
    return Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'PHP'): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Calculate percentage change between two values
   */
  calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

// Export singleton instance
export const unifiedAnalyticsService = new UnifiedAnalyticsService(); 