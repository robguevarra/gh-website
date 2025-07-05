import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    // Get P2P enrollments (people who enrolled)
    const p2pEnrollmentsResult = await supabase
      .from('enrollments')
      .select('id, enrolled_at, unified_profiles!inner(id, email, first_name, last_name)', { count: 'exact' })
      .gte('enrolled_at', startDate)
      .lte('enrolled_at', endDate);

    // Get Canva ebook purchases
    const canvaEbookResult = await supabase
      .from('ebook_contacts')
      .select('email, first_name, last_name, created_at', { count: 'exact' })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Get today's Canva ebook purchases
    const todayCanvaResult = await supabase
      .from('ebook_contacts')
      .select('email', { count: 'exact' })
      .gte('created_at', new Date().toISOString().split('T')[0])
      .lt('created_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    // Get this month's Canva ebook purchases
    const monthlyCanvaResult = await supabase
      .from('ebook_contacts')
      .select('email', { count: 'exact' })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());

    // Get revenue from unified revenue view for the period
    const revenueResult = await supabase
      .from('unified_revenue_view')
      .select('*')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .in('status', ['success', 'SUCCEEDED', 'paid']);

    // Get recent Shopify orders with item details
    const recentShopifyResult = await supabase
      .from('shopify_orders')
      .select(`
        id,
        created_at,
        total_price,
        email,
        financial_status,
        shopify_order_items!inner(
          title,
          price,
          quantity
        )
      `)
      .eq('financial_status', 'paid')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get top grossing Shopify products for the period
    const topProductsResult = await supabase
      .from('shopify_order_items')
      .select(`
        title,
        price,
        quantity,
        shopify_orders!inner(
          financial_status,
          created_at
        )
      `)
      .gte('shopify_orders.created_at', startDate)
      .lte('shopify_orders.created_at', endDate)
      .eq('shopify_orders.financial_status', 'paid');

    // Process revenue data
    const revenueData = revenueResult.data || [];
    const revenueByProduct = revenueData.reduce((acc: any, transaction: any) => {
      const productType = transaction.product_type || 'Unknown';
      const platform = transaction.platform || 'Unknown';
      const key = `${productType} (${platform})`;
      
      if (!acc[key]) {
        acc[key] = {
          product_type: productType,
          platform,
          total_revenue: 0,
          transaction_count: 0
        };
      }
      
      acc[key].total_revenue += parseFloat(transaction.amount || 0);
      acc[key].transaction_count += 1;
      
      return acc;
    }, {});

    // Process top Shopify products
    const topProducts = (topProductsResult.data || []).reduce((acc: any, item: any) => {
      const title = item.title;
      if (!acc[title]) {
        acc[title] = {
          title,
          total_revenue: 0,
          total_quantity: 0,
          order_count: 0
        };
      }
      
      acc[title].total_revenue += parseFloat(item.price || 0) * (item.quantity || 1);
      acc[title].total_quantity += item.quantity || 1;
      acc[title].order_count += 1;
      
      return acc;
    }, {});

    // Sort top products by revenue
    const topProductsArray = Object.values(topProducts)
      .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    // Calculate totals
    const totalRevenue = revenueData.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0);
    const totalP2PEnrollments = p2pEnrollmentsResult.count || 0;
    const totalCanvaEbooks = canvaEbookResult.count || 0;
    const todayCanvaEbooks = todayCanvaResult.count || 0;
    const monthlyCanvaEbooks = monthlyCanvaResult.count || 0;

    // Get recent purchases (last 10 transactions)
    const recentPurchases = revenueData
      .sort((a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      .slice(0, 10)
      .map((transaction: any) => ({
        transaction_id: transaction.transaction_id,
        amount: parseFloat(transaction.amount || 0),
        product_type: transaction.product_type,
        platform: transaction.platform,
        transaction_date: transaction.transaction_date,
        contact_email: transaction.contact_email
      }));

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalP2PEnrollments,
        totalCanvaEbooks,
        todayCanvaEbooks,
        monthlyCanvaEbooks,
        totalTransactions: revenueData.length
      },
      revenueByProduct: Object.values(revenueByProduct).sort((a: any, b: any) => b.total_revenue - a.total_revenue),
      topShopifyProducts: topProductsArray,
      recentPurchases,
      recentShopifyOrders: (recentShopifyResult.data || []).map((order: any) => ({
        id: order.id,
        created_at: order.created_at,
        total_price: parseFloat(order.total_price || 0),
        email: order.email,
        items: order.shopify_order_items.map((item: any) => ({
          title: item.title,
          price: parseFloat(item.price || 0),
          quantity: item.quantity
        }))
      })),
      canvaEbookPurchases: (canvaEbookResult.data || []).slice(0, 20).map((purchase: any) => ({
        email: purchase.email,
        name: `${purchase.first_name || ''} ${purchase.last_name || ''}`.trim() || 'Anonymous',
        created_at: purchase.created_at
      }))
    });

  } catch (error: any) {
    console.error('Error fetching enhanced revenue metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enhanced revenue metrics', details: error.message },
      { status: 500 }
    );
  }
} 