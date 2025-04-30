"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, PackageOpen } from 'lucide-react';
import { PurchaseHistoryList } from '@/components/dashboard/purchase-history-list';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { useAuth } from '@/context/auth-context';

// Define unified structures first
interface UnifiedOrderItem {
  id: string; // Use item ID
  product_id: string | null; // e.g., shopify_products.id or shopify_order_items.product_id (if available)
  title: string | null;
  variant_title?: string | null; // Specific to Shopify items
  quantity: number;
  price_at_purchase: number;
  image_url: string | null; // e.g., shopify_products.featured_image_url
  google_drive_file_id?: string | null; // Make optional or required as needed
  source: 'ecommerce' | 'shopify'; // Distinguish item source
}

interface UnifiedPurchase {
  id: string; // Use order ID
  order_number: string | null; // Use shopify_orders.order_number if available, maybe generate for ecommerce?
  created_at: string;
  order_status: string | null; // Status might differ
  total_amount: number | null; // Use total_price from shopify_orders
  currency: string | null;
  items: UnifiedOrderItem[];
  source: 'ecommerce' | 'shopify'; // Distinguish order source
}

// Helper function to fetch and combine orders
async function getPurchaseHistory(userId: string): Promise<UnifiedPurchase[] | null> {
  const supabase = getBrowserClient();

  try {
    // 1. Fetch Ecommerce Orders
    const { data: ecommerceData, error: ecommerceError } = await supabase
      .from('ecommerce_orders')
      .select(`
        id,
        created_at,
        order_status,
        total_amount,
        currency,
        ecommerce_order_items (
          id,
          quantity,
          price_at_purchase,
          currency, 
          shopify_products ( id, title, featured_image_url, google_drive_file_id )
        )
      `)
      .eq('user_id', userId) 
      .order('created_at', { ascending: false });

    if (ecommerceError) {
      console.error('[PurchaseHistory] Error fetching ecommerce orders:', JSON.stringify(ecommerceError, null, 2));
    }

    // 2. Fetch Shopify Orders
    let shopifyData: any[] | null = null;
    try {
        const { data: profileData, error: profileError } = await supabase
            .from('unified_profiles')
            .select('id')
            .eq('id', userId) 
            .maybeSingle();

        if (profileError) {
            console.error('[PurchaseHistory] Error fetching unified profile:', JSON.stringify(profileError, null, 2));
        } else if (profileData?.id) {
            const { data: customerData, error: customerError } = await supabase
                .from('shopify_customers')
                .select('id')
                .eq('unified_profile_id', profileData.id);

            if (customerError) {
                console.error('[PurchaseHistory] Error fetching shopify customer:', JSON.stringify(customerError, null, 2));
            } else if (customerData && customerData.length > 0) {
                const shopifyCustomerIds = customerData.map(c => c.id);
                const { data: fetchedShopifyData, error: shopifyOrdersError } = await supabase
                    .from('shopify_orders')
                    .select(`
                        id,
                        order_number,
                        created_at,
                        financial_status, 
                        fulfillment_status,
                        total_price,
                        currency,
                        shopify_order_items (
                            id,
                            product_id,
                            variant_id,
                            title,
                            variant_title,
                            quantity,
                            price
                        )
                    `)
                    .in('customer_id', shopifyCustomerIds)
                    .order('created_at', { ascending: false });

                if (shopifyOrdersError) {
                    console.error('[PurchaseHistory] Error fetching shopify orders:', JSON.stringify(shopifyOrdersError, null, 2));
                } else {
                    shopifyData = fetchedShopifyData;
                }
            }
        }
    } catch (shopifyFetchErr) {
         console.error('[PurchaseHistory] Unexpected error during Shopify data fetch:', shopifyFetchErr);
    }

    // 2.5 Fetch Shopify Product Images
    let shopifyImageUrlMap = new Map<string, string | null>();
    if (shopifyData && shopifyData.length > 0) {
        const shopifyProductIds = [
            ...new Set(
                shopifyData
                    .flatMap(order => order.shopify_order_items || [])
                    .map(item => item.product_id)
                    .filter((id): id is string => !!id)
            )
        ];

        if (shopifyProductIds.length > 0) {
            const { data: productImages, error: imageError } = await supabase
                .from('shopify_products')
                .select('id, featured_image_url')
                .in('id', shopifyProductIds);

            if (imageError) {
                console.error('[PurchaseHistory] Error fetching Shopify product images:', imageError);
            } else if (productImages) {
                productImages.forEach(img => {
                    shopifyImageUrlMap.set(img.id, img.featured_image_url);
                });
            }
        }
    }

    // 3. Combine and Format Data
    const unifiedPurchases: UnifiedPurchase[] = [];
    let mappedEcommerce: UnifiedPurchase[] = [];

    if (ecommerceData) {
      try {
        mappedEcommerce = ecommerceData.map(order => mapEcommerceOrderToUnified(order));
        unifiedPurchases.push(...mappedEcommerce);
      } catch (mapError) {
           console.error('[PurchaseHistory] Error mapping ecommerce data:', mapError);
      }
    }

    if (shopifyData) {
       try {
           const mappedShopify = shopifyData.map(order => mapShopifyOrderToUnified(order, shopifyImageUrlMap));
           unifiedPurchases.push(...mappedShopify);
       } catch (mapError) {
            console.error('[PurchaseHistory] Error mapping shopify data:', mapError);
       }
    }

    // 4. Sort Combined Data
    unifiedPurchases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return unifiedPurchases;

  } catch (error) {
    console.error('[PurchaseHistory] Error in getPurchaseHistory main try/catch:', error);
    return null;
  }
}

// --- Helper Mappers ---

function mapEcommerceOrderToUnified(order: any): UnifiedPurchase {
   if (!order || !order.id) {
      console.warn('[mapEcommerceOrderToUnified] Received invalid order object:', order);
      return null as any;
   }
   return {
    id: order.id,
    order_number: `ECO-${order.id.substring(0, 6)}`, 
    created_at: order.created_at,
    order_status: order.order_status,
    total_amount: order.total_amount,
    currency: order.currency,
    source: 'ecommerce',
    items: order.ecommerce_order_items?.map((item: any): UnifiedOrderItem | null => {
      if (!item || !item.id) {
         console.warn('[mapEcommerceOrderToUnified] Received invalid item object within order:', item);
         return null; 
      }
      return {
        id: item.id,
        product_id: item.shopify_products?.id ?? null,
        title: item.shopify_products?.title ?? 'N/A',
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        image_url: item.shopify_products?.featured_image_url ?? null,
        google_drive_file_id: item.shopify_products?.google_drive_file_id ?? null,
        source: 'ecommerce',
      };
    }).filter(Boolean) ?? [],
  };
}

function mapShopifyOrderToUnified(order: any, imageUrlMap: Map<string, string | null>): UnifiedPurchase {
  let status = 'Processing';
  if (order.financial_status === 'paid' && order.fulfillment_status === 'fulfilled') {
    status = 'Completed';
  } else if (order.financial_status === 'refunded' || order.financial_status === 'partially_refunded') {
    status = 'Refunded';
  } else if (order.fulfillment_status === 'fulfilled') {
    status = 'Shipped';
  } else if (order.financial_status === 'paid') {
      status = 'Paid';
  }

  return {
    id: order.id,
    order_number: order.order_number ? String(order.order_number) : `SHO-${order.id.substring(0,6)}`,
    created_at: order.created_at,
    order_status: status,
    total_amount: parseFloat(order.total_price) || 0,
    currency: order.currency,
    source: 'shopify',
    items: order.shopify_order_items?.map((item: any, index: number): UnifiedOrderItem => {
      const productId = item.product_id ? String(item.product_id) : null;
      const imageUrl = productId ? imageUrlMap.get(productId) ?? null : null;

      return {
          id: item.id,
          product_id: productId,
          title: item.title ?? 'N/A',
          variant_title: item.variant_title,
          quantity: item.quantity,
          price_at_purchase: parseFloat(item.price) || 0,
          image_url: imageUrl,
          source: 'shopify',
      };
    }) ?? [],
  };
}

// --- Component ---

export default function PurchaseHistoryPage() {
  const purchases = useStudentDashboardStore(state => state.purchases);
  const isLoadingPurchases = useStudentDashboardStore(state => state.isLoadingPurchases);
  const hasPurchasesError = useStudentDashboardStore(state => state.hasPurchasesError);
  const loadPurchases = useStudentDashboardStore(state => state.loadPurchases);
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    // Fetch purchase history when user is available
    if (!userId || isAuthLoading) return;
    loadPurchases(userId);
  }, [userId, isAuthLoading, loadPurchases]);

  if (isLoadingPurchases) return <div>Loading...</div>;
  if (hasPurchasesError)
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load purchase history.</AlertDescription>
        </Alert>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-10 font-sans">
      <h1 className="font-serif text-4xl font-bold mb-6 text-brand-purple">Purchase History</h1>

      {purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-brand-light rounded-lg border border-brand-blue/20">
          <PackageOpen className="h-16 w-16 text-brand-purple mb-5" />
          <p className="text-muted-foreground mb-6 text-lg">You haven't made any purchases yet.</p>
          <Button asChild size="lg" className="bg-brand-purple hover:bg-brand-purple/90 text-white">
            <Link href="/dashboard/store">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <PurchaseHistoryList purchases={purchases} />
      )}

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Missing an order or need help with a download?
          <a href="mailto:support@gracefulhustle.com" className="text-brand-purple hover:underline ml-1">
            Contact Support
          </a>
        </p>
      </div>

    </div>
  );
}