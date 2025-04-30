import { getBrowserClient } from '@/lib/supabase/client';

export interface PurchaseItem {
  id: string;
  product_id: string | null;
  title: string;
  variant_title?: string | null;
  quantity: number;
  price_at_purchase: number;
  image_url: string | null;
  google_drive_file_id?: string | null;
  source: 'ecommerce' | 'shopify';
}

export interface Purchase {
  id: string;
  order_number: string | null;
  created_at: string;
  order_status: string | null;
  total_amount: number | null;
  currency: string | null;
  items: PurchaseItem[];
  source: 'ecommerce' | 'shopify';
}

// Fetch and unify purchase history for a user
export async function fetchPurchaseHistory(userId: string): Promise<Purchase[] | null> {
  const supabase = getBrowserClient();
  try {
    // 1. Fetch Ecommerce Orders
    const { data: ecommerceData, error: ecommerceError } = await supabase
      .from('ecommerce_orders')
      .select(
        `
        id,
        created_at,
        order_status,
        total_amount,
        currency,
        ecommerce_order_items (
          id,
          quantity,
          price_at_purchase,
          shopify_products ( id, title, featured_image_url, google_drive_file_id )
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (ecommerceError) console.error('[fetchPurchaseHistory] Ecommerce error:', ecommerceError);

    // 2. Fetch Shopify Orders
    let shopifyData: any[] | null = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('unified_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) {
        console.error('[fetchPurchaseHistory] Profile error:', profileError);
      } else if (profileData?.id) {
        const { data: customerData, error: customerError } = await supabase
          .from('shopify_customers')
          .select('id')
          .eq('unified_profile_id', profileData.id);
        if (customerError) {
          console.error('[fetchPurchaseHistory] Customer error:', customerError);
        } else if (customerData?.length) {
          const customerIds = customerData.map(c => c.id);
          const { data: fetchedShopify, error: shopifyError } = await supabase
            .from('shopify_orders')
            .select(
              `
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
            `
            )
            .in('customer_id', customerIds)
            .order('created_at', { ascending: false });
          if (shopifyError) console.error('[fetchPurchaseHistory] Shopify orders error:', shopifyError);
          else shopifyData = fetchedShopify;
        }
      }
    } catch (err) {
      console.error('[fetchPurchaseHistory] Unexpected Shopify fetch error:', err);
    }

    // 3. Fetch Shopify product images
    const imageMap = new Map<string, string | null>();
    if (shopifyData?.length) {
      const productIds = Array.from(
        new Set(
          shopifyData.flatMap(o => o.shopify_order_items?.map((i: any) => i.product_id)).filter(Boolean) as string[]
        )
      );
      if (productIds.length) {
        const { data: images, error: imgError } = await supabase
          .from('shopify_products')
          .select('id, featured_image_url')
          .in('id', productIds);
        if (imgError) console.error('[fetchPurchaseHistory] Image fetch error:', imgError);
        else images?.forEach(img => imageMap.set(img.id, img.featured_image_url));
      }
    }

    // 4. Map to unified structures
    const unified: Purchase[] = [];
    if (ecommerceData) {
      const mapped = ecommerceData.map(o => ({
        id: o.id,
        order_number: `ECO-${o.id.substring(0, 6)}`,
        created_at: o.created_at,
        order_status: o.order_status,
        total_amount: o.total_amount,
        currency: o.currency,
        source: 'ecommerce' as const,
        items: o.ecommerce_order_items?.map((i: any) => ({
          id: i.id,
          product_id: i.shopify_products?.id ?? null,
          title: i.shopify_products?.title ?? 'N/A',
          variant_title: null,
          quantity: i.quantity,
          price_at_purchase: i.price_at_purchase,
          image_url: i.shopify_products?.featured_image_url ?? null,
          google_drive_file_id: i.shopify_products?.google_drive_file_id ?? null,
          source: 'ecommerce' as const,
        })) ?? [],
      }));
      unified.push(...mapped);
    }
    if (shopifyData) {
      const mapped = shopifyData.map(o => {
        let status = 'Processing';
        if (o.financial_status === 'paid' && o.fulfillment_status === 'fulfilled') status = 'Completed';
        else if (['refunded', 'partially_refunded'].includes(o.financial_status)) status = 'Refunded';
        else if (o.fulfillment_status === 'fulfilled') status = 'Shipped';
        else if (o.financial_status === 'paid') status = 'Paid';
        return {
          id: o.id,
          order_number: o.order_number ? String(o.order_number) : `SHO-${o.id.substring(0, 6)}`,
          created_at: o.created_at,
          order_status: status,
          total_amount: parseFloat(o.total_price) || 0,
          currency: o.currency,
          source: 'shopify' as const,
          items: o.shopify_order_items?.map((i: any) => ({
            id: i.id,
            product_id: i.product_id ? String(i.product_id) : null,
            title: i.title ?? 'N/A',
            variant_title: i.variant_title ?? null,
            quantity: i.quantity,
            price_at_purchase: parseFloat(i.price) || 0,
            image_url: i.product_id ? imageMap.get(String(i.product_id)) ?? null : null,
            source: 'shopify' as const,
          })) ?? [],
        };
      });
      unified.push(...mapped);
    }

    // 5. Sort by date
    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return unified;
  } catch (err) {
    console.error('[fetchPurchaseHistory] Main error:', err);
    return null;
  }
}
