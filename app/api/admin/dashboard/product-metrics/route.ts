import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

type ProductMetrics = {
  productType: string;
  platform: string;
  totalRevenue: number;
  transactionCount: number;
  averageOrderValue: number;
  percentageOfTotal: number;
};

type ProductSummary = {
  totalRevenue: number;
  totalTransactions: number;
  productBreakdown: ProductMetrics[];
  platformSummary: {
    platform: string;
    revenue: number;
    transactionCount: number;
    percentage: number;
  }[];
};

function parseDateParam(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminClient();
    const url = new URL(req.url);
    const params = url.searchParams;
    
    // Parse date parameters
    const startParam = parseDateParam(params.get('startDate') ?? '');
    const endParam = parseDateParam(params.get('endDate') ?? '');

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "Start date and end date parameters are required." },
        { status: 400 }
      );
    }

    const startDate = startParam;
    const endDate = endParam;
    endDate.setUTCHours(23, 59, 59, 999);

    // Get detailed breakdown by product and platform using multiple queries
    const [
      { data: transactionData, error: transactionError },
      { data: shopifyData, error: shopifyError },
      { data: ecommerceData, error: ecommerceError }
    ] = await Promise.all([
      admin
        .from('transactions')
        .select('amount, transaction_type, created_at')
        .in('status', ['completed', 'success', 'SUCCEEDED', 'paid'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      admin
        .from('shopify_orders')
        .select('total_price, created_at')
        .eq('financial_status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      admin
        .from('ecommerce_orders')
        .select('total_amount, created_at')
        .eq('order_status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ]);

    if (transactionError || shopifyError || ecommerceError) {
      console.error('Error fetching revenue breakdown:', { transactionError, shopifyError, ecommerceError });
      throw transactionError || shopifyError || ecommerceError;
    }

    // Process the data
    const productMap = new Map<string, {
      platform: string;
      productType: string;
      totalRevenue: number;
      transactionCount: number;
    }>();

    const platformMap = new Map<string, {
      revenue: number;
      transactionCount: number;
    }>();

    let totalRevenue = 0;
    let totalTransactions = 0;

    // Process transaction data
    (transactionData || []).forEach((record: any) => {
      const platform = 'xendit';
      const product_type = record.transaction_type;
      const key = `${platform}-${product_type}`;
      const numAmount = Number(record.amount || 0);
      
      totalRevenue += numAmount;
      totalTransactions += 1;

      // Product breakdown
      if (!productMap.has(key)) {
        productMap.set(key, {
          platform,
          productType: product_type,
          totalRevenue: 0,
          transactionCount: 0
        });
      }
      const productData = productMap.get(key)!;
      productData.totalRevenue += numAmount;
      productData.transactionCount += 1;

      // Platform summary
      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          revenue: 0,
          transactionCount: 0
        });
      }
      const platformData = platformMap.get(platform)!;
      platformData.revenue += numAmount;
      platformData.transactionCount += 1;
    });

    // Process Shopify data
    (shopifyData || []).forEach((record: any) => {
      const platform = 'shopify';
      const product_type = 'shopify_product';
      const key = `${platform}-${product_type}`;
      const numAmount = Number(record.total_price || 0);
      
      totalRevenue += numAmount;
      totalTransactions += 1;

      // Product breakdown
      if (!productMap.has(key)) {
        productMap.set(key, {
          platform,
          productType: product_type,
          totalRevenue: 0,
          transactionCount: 0
        });
      }
      const productData = productMap.get(key)!;
      productData.totalRevenue += numAmount;
      productData.transactionCount += 1;

      // Platform summary
      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          revenue: 0,
          transactionCount: 0
        });
      }
      const platformData = platformMap.get(platform)!;
      platformData.revenue += numAmount;
      platformData.transactionCount += 1;
    });

    // Process ecommerce data
    (ecommerceData || []).forEach((record: any) => {
      const platform = 'ecommerce';
      const product_type = 'shopify_ecom';
      const key = `${platform}-${product_type}`;
      const numAmount = Number(record.total_amount || 0);
      
      totalRevenue += numAmount;
      totalTransactions += 1;

      // Product breakdown
      if (!productMap.has(key)) {
        productMap.set(key, {
          platform,
          productType: product_type,
          totalRevenue: 0,
          transactionCount: 0
        });
      }
      const productData = productMap.get(key)!;
      productData.totalRevenue += numAmount;
      productData.transactionCount += 1;

      // Platform summary
      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          revenue: 0,
          transactionCount: 0
        });
      }
      const platformData = platformMap.get(platform)!;
      platformData.revenue += numAmount;
      platformData.transactionCount += 1;
    });

    // Convert to arrays and calculate percentages
    const productBreakdown: ProductMetrics[] = Array.from(productMap.entries()).map(([key, data]) => ({
      productType: data.productType,
      platform: data.platform,
      totalRevenue: data.totalRevenue,
      transactionCount: data.transactionCount,
      averageOrderValue: data.transactionCount > 0 ? data.totalRevenue / data.transactionCount : 0,
      percentageOfTotal: totalRevenue > 0 ? (data.totalRevenue / totalRevenue) * 100 : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const platformSummary = Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      revenue: data.revenue,
      transactionCount: data.transactionCount,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);

    const result: ProductSummary = {
      totalRevenue,
      totalTransactions,
      productBreakdown,
      platformSummary
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in product metrics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 