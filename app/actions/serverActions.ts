'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

/**
 * Fetches the IDs of products successfully purchased by the current user from BOTH
 * new ecommerce system and historical Shopify orders.
 * This is a server action that can be called from both server and client components.
 * @returns {Promise<string[]>} A promise that resolves to a unique array of owned product IDs.
 */
export async function getOwnedProductIdsServer(): Promise<string[]> {
  noStore(); // Prevent caching since this is user-specific data
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log('[getOwnedProductIdsServer] Starting for user:', user?.id);

  if (!user) return [];

  const ownedProductIds = new Set<string>();
  const ownedProductTitles = new Set<string>();

  try {
    // 1. Fetch Ecommerce Orders (same approach as before)
    console.log('[getOwnedProductIdsServer] Fetching ecommerce orders for user:', user.id);
    const { data: ecommerceItems, error: ecommerceError } = await supabase
      .from('ecommerce_order_items')
      .select(`product_id, ecommerce_orders!inner(user_id, order_status)`) 
      .eq('ecommerce_orders.user_id', user.id)
      .in('ecommerce_orders.order_status', ['processing', 'completed'])
      .not('product_id', 'is', null);

    if (ecommerceError) {
      console.error('[getOwnedProductIdsServer] Error fetching ecommerce owned products:', ecommerceError);
    } else if (ecommerceItems) {
      console.log('[getOwnedProductIdsServer] Found ecommerce items:', ecommerceItems.length);
      ecommerceItems.forEach(item => {
        if (item.product_id) {
          ownedProductIds.add(item.product_id);
        }
      });
    } else {
      console.log('[getOwnedProductIdsServer] No ecommerce items found');
    }

    // 2. Fetch Shopify Orders - using the same approach as fetchPurchaseHistory
    try {
      // First, get the unified profile
      const { data: profileData, error: profileError } = await supabase
        .from('unified_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[getOwnedProductIdsServer] Profile error:', profileError);
      } else if (profileData?.id) {
        // Then, get any shopify customers linked to this profile
        const { data: customerData, error: customerError } = await supabase
          .from('shopify_customers')
          .select('id')
          .eq('unified_profile_id', profileData.id);
          
        if (customerError) {
          console.error('[getOwnedProductIdsServer] Customer error:', customerError);
        } else if (customerData?.length) {
          const customerIds = customerData.map(c => c.id);
          console.log('[getOwnedProductIdsServer] Found Shopify customers:', customerIds.length);
          
          // Get all order items for these customers - using correct query structure for RLS
          // Start from shopify_orders table and nest the selection of items
          // Get all shopify_products to have a reference for IDs
          const { data: allProducts, error: productsError } = await supabase
            .from('shopify_products')
            .select('id, title');
            
          if (productsError) {
            console.error('[getOwnedProductIdsServer] Error fetching all products:', productsError);
          } else if (allProducts?.length) {
            console.log('[getOwnedProductIdsServer] Found', allProducts.length, 'products in database');
            console.log('[getOwnedProductIdsServer] Sample product IDs:', allProducts.slice(0, 3).map(p => ({ id: p.id, title: p.title })));
          }
          
          // Exactly matching the pattern from fetchPurchaseHistory that works for all users
          const { data: shopifyOrders, error: shopifyError } = await supabase
            .from('shopify_orders')
            .select(`
              id,
              order_number,
              financial_status,
              customer_id,
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
            .in('customer_id', customerIds)
            .eq('financial_status', 'paid');

          if (shopifyError) {
            console.error('[getOwnedProductIdsServer] Shopify orders error:', shopifyError);
          } else if (shopifyOrders?.length) {
            console.log('[getOwnedProductIdsServer] Found Shopify orders:', shopifyOrders.length);
            
            // Add each product ID to our set
            const beforeCount = ownedProductIds.size;
            let itemCount = 0;
            
            // Process nested items from each order
            shopifyOrders.forEach((order, index) => {
              console.log(`[getOwnedProductIdsServer] Processing order #${index+1}, id: ${order.id}`);
              
              if (order.shopify_order_items && Array.isArray(order.shopify_order_items)) {
                itemCount += order.shopify_order_items.length;
                console.log(`[getOwnedProductIdsServer] Order has ${order.shopify_order_items.length} items`);
                
                // Log the first item's structure to debug
                if (order.shopify_order_items.length > 0) {
                  console.log('[getOwnedProductIdsServer] First item structure:', JSON.stringify(order.shopify_order_items[0], null, 2));
                }
                
                order.shopify_order_items.forEach((item, itemIndex) => {
                  // Log more details about each item
                  console.log(`[getOwnedProductIdsServer] Item #${itemIndex+1}:`, {
                    id: item.id,
                    product_id: item.product_id,
                    type: item.product_id ? typeof item.product_id : 'undefined/null',
                    title: item.title
                  });
                  
                  // Robust extraction of product_id, matching the purchase history implementation
                  const productId = item.product_id ? String(item.product_id) : null;
                  const title = item.title ? item.title.trim() : null;
                  
                  if (productId) {
                    console.log(`[getOwnedProductIdsServer] Adding product_id to owned set:`, productId);
                    ownedProductIds.add(productId);
                  } else if (title) {
                    // When product_id is missing, store the title for later resolution
                    console.log(`[getOwnedProductIdsServer] No product_id, adding title to owned titles set:`, title);
                    ownedProductTitles.add(title);
                  } else {
                    console.log(`[getOwnedProductIdsServer] Warning: Item #${itemIndex+1} has no valid product_id or title`);
                  }
                });
              } else {
                console.log('[getOwnedProductIdsServer] Order has no shopify_order_items or it is not an array', order.shopify_order_items);
              }
            });
            
            console.log('[getOwnedProductIdsServer] Processed', itemCount, 'order items');
            console.log('[getOwnedProductIdsServer] Added Shopify products:', ownedProductIds.size - beforeCount);
          } else {
            console.log('[getOwnedProductIdsServer] No Shopify order items found');
          }
        } else {
          console.log('[getOwnedProductIdsServer] No Shopify customers found for this user');
        }
      } else {
        console.log('[getOwnedProductIdsServer] No unified profile found for this user');
      }
    } catch (shopifyErr) {
      console.error('[getOwnedProductIdsServer] Error during Shopify order processing:', shopifyErr);
    }

    // 3. Resolve product IDs from titles if we have any
    if (ownedProductTitles.size > 0) {
      console.log(`[getOwnedProductIdsServer] Attempting to resolve ${ownedProductTitles.size} product titles to IDs`);
      try {
        // Get products matching our titles
        const { data: titleMatchedProducts, error: titleError } = await supabase
          .from('shopify_products')
          .select('id, title')
          .in('title', [...ownedProductTitles]);
        
        if (titleError) {
          console.error('[getOwnedProductIdsServer] Error resolving titles to IDs:', titleError);
        } else if (titleMatchedProducts?.length) {
          console.log(`[getOwnedProductIdsServer] Found ${titleMatchedProducts.length} products matching titles`);
          
          // Add the resolved product IDs to our set
          titleMatchedProducts.forEach(product => {
            if (product.id) {
              console.log(`[getOwnedProductIdsServer] Resolved title "${product.title}" to ID: ${product.id}`);
              ownedProductIds.add(String(product.id));
            }
          });
        } else {
          console.log('[getOwnedProductIdsServer] No products found matching the titles');
        }
      } catch (err) {
        console.error('[getOwnedProductIdsServer] Error during title resolution:', err);
      }
    }
    
    // 4. Debug log for final ID set
    if (ownedProductIds.size > 0) {
      console.log('[getOwnedProductIdsServer] Final owned product IDs:', [...ownedProductIds]);
    }
    
    // Return the unique list
    const finalOwnedIds = [...ownedProductIds];
    console.log('[getOwnedProductIdsServer] Total owned products found:', finalOwnedIds.length);
    return finalOwnedIds;

  } catch (err) {
    console.error('[getOwnedProductIdsServer] Unexpected error:', err);
    return []; // Return empty array on unexpected error
  }
}
