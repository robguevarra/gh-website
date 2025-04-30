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
          // Include shopify_products relationship through order items for image access
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
                price,
                shopify_products (id, featured_image_url)
              )
            `
            )
            .in('customer_id', customerIds)
            .order('created_at', { ascending: false});
          if (shopifyError) {
            console.error('[fetchPurchaseHistory] Shopify orders error:', shopifyError);
          } else {
            shopifyData = fetchedShopify;
            
            // Log the first order structure to debug
            if (fetchedShopify && fetchedShopify.length > 0) {
              console.log('[fetchPurchaseHistory] First order structure:', JSON.stringify(fetchedShopify[0], null, 2));
              
              // Check if order items exist
              if (fetchedShopify[0].shopify_order_items && fetchedShopify[0].shopify_order_items.length > 0) {
                console.log('[fetchPurchaseHistory] First order item structure:', 
                  JSON.stringify(fetchedShopify[0].shopify_order_items[0], null, 2));
                  
                // Specifically check if shopify_products is included
                if (fetchedShopify[0].shopify_order_items[0].shopify_products) {
                  console.log('[fetchPurchaseHistory] Product data found in order item! 🎉');
                } else {
                  console.log('[fetchPurchaseHistory] No product data in order item. Check RLS or query.');
                }
              } else {
                console.log('[fetchPurchaseHistory] No order items found in first order');
              }
            } else {
              console.log('[fetchPurchaseHistory] No Shopify orders found');
            }
          }
        }
      }
    } catch (err) {
      console.error('[fetchPurchaseHistory] Unexpected Shopify fetch error:', err);
    }

    // 3. Fetch Shopify product images - PRIMARY METHOD: by ID
    const imageMapById = new Map<string, string | null>();
    const titleToImageMap = new Map<string, string | null>();
    
    if (shopifyData?.length) {
      // Step 1: Extract all product IDs and titles from order items
      const allProductIds: string[] = [];
      const allProductTitles: string[] = [];
      
      shopifyData.forEach(order => {
        if (!order.shopify_order_items || !Array.isArray(order.shopify_order_items)) {
          console.log('[fetchPurchaseHistory] Order missing shopify_order_items:', order.id);
          return;
        }
        
        order.shopify_order_items.forEach((item: any) => {
          // Collect product IDs when available
          if (item.product_id) {
            allProductIds.push(String(item.product_id));
          } else {
            console.log('[fetchPurchaseHistory] Item missing product_id in order:', order.id);
          }
          
          // Always collect titles for fallback matching
          if (item.title) {
            allProductTitles.push(item.title);
          }
        });
      });
      
      // Deduplicate IDs and titles
      const uniqueProductIds = Array.from(new Set(allProductIds));
      const uniqueProductTitles = Array.from(new Set(allProductTitles));
      
      console.log(`[fetchPurchaseHistory] Found ${uniqueProductIds.length} unique product IDs and ${uniqueProductTitles.length} unique titles`);
      
      // Step 2: First try fetching by ID when available
      if (uniqueProductIds.length > 0) {
        try {
          const { data: imagesById, error: imgError } = await supabase
            .from('shopify_products')
            .select('id, featured_image_url')
            .in('id', uniqueProductIds);

          if (imgError) {
            console.error('[fetchPurchaseHistory] Image fetch by ID error:', imgError);
          } else if (imagesById && imagesById.length > 0) {
            console.log(`[fetchPurchaseHistory] Successfully fetched ${imagesById.length} product images by ID`);
            imagesById.forEach(img => imageMapById.set(img.id, img.featured_image_url));
          }
        } catch (imgFetchErr) {
          console.error('[fetchPurchaseHistory] Exception during image fetch by ID:', imgFetchErr);
        }
      }
      
      // Step 3: FALLBACK - Fetch products by title (simpler approach for more reliability)
      // Instead of complex OR queries that might fail due to formatting issues, let's fetch products directly
      if (uniqueProductTitles.length > 0) {
        try {
          console.log('[fetchPurchaseHistory] Attempting to fetch products by title...');
          
          // Get all products (simpler and more reliable than complex OR queries)
          const { data: allProducts, error: productsError } = await supabase
            .from('shopify_products')
            .select('id, title, featured_image_url');

          if (productsError) {
            console.error('[fetchPurchaseHistory] Error fetching all products:', productsError);
          } else if (!allProducts || allProducts.length === 0) {
            console.log('[fetchPurchaseHistory] No products found in database');
          } else {
            console.log(`[fetchPurchaseHistory] Retrieved ${allProducts.length} total products from database`);
            
            // Find products whose titles match or contain our order item titles
            const matchingProducts = [];
            uniqueProductTitles.forEach(orderItemTitle => {
              // Convert to lowercase for case-insensitive matching
              const lowerOrderTitle = orderItemTitle.toLowerCase().trim();
              
              console.log(`[fetchPurchaseHistory] Looking for matches for "${lowerOrderTitle}"`);
              
              // Find products that contain this title
              const matches = allProducts.filter(product => 
                product.title && product.title.toLowerCase().includes(lowerOrderTitle));
              
              if (matches.length > 0) {
                console.log(`[fetchPurchaseHistory] Found ${matches.length} matches for "${lowerOrderTitle}"`);
                matchingProducts.push(...matches);
                
                // Map the exact title for direct lookup
                titleToImageMap.set(lowerOrderTitle, matches[0].featured_image_url);
              } else {
                console.log(`[fetchPurchaseHistory] No product matches found for "${lowerOrderTitle}"`);
              }
            });
            
            console.log(`[fetchPurchaseHistory] Found ${matchingProducts.length} total matching products`);  
          }
        } catch (titleFetchErr) {
          console.error('[fetchPurchaseHistory] Exception during product title matching:', titleFetchErr);
        }
      }
    } else {
      console.log('[fetchPurchaseHistory] No Shopify orders found, skipping image fetches');
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
          items: o.shopify_order_items?.map((i: any) => {
            const productId = i.product_id ? String(i.product_id) : null;
            
            // Try to get image URL from multiple sources with fallbacks:
            // 1. Direct relationship (if the nested shopify_products is available)
            // 2. ID mapping (if we have a product ID)
            // 3. Title mapping (as a last resort)
            let imageUrl = i.shopify_products?.featured_image_url ?? null;
            
            if (!imageUrl && productId) {
              imageUrl = imageMapById.get(productId) ?? null;
            }
            
            if (!imageUrl && i.title) {
              imageUrl = titleToImageMap.get(i.title.toLowerCase()) ?? null;
            }
            
            return {
              id: i.id,
              product_id: productId,
              title: i.title ?? 'N/A',
              variant_title: i.variant_title ?? null,
              quantity: i.quantity,
              price_at_purchase: parseFloat(i.price) || 0,
              image_url: imageUrl,
              source: 'shopify' as const,
            };
          }) ?? [],
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
