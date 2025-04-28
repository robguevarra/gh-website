'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

/**
 * Fetches the IDs of products successfully purchased by the current user from BOTH
 * new ecommerce system and historical Shopify orders.
 * Filters by appropriate statuses in each system.
 * Uses noStore() to prevent caching of this user-specific data.
 * @returns {Promise<string[]>} A promise that resolves to a unique array of owned product IDs.
 */
export async function getOwnedProductIds(): Promise<string[]> {
  noStore();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let ownedProductIds = new Set<string>();

  try {
    // 1. Fetch from new Ecommerce Orders
    const { data: ecommerceItems, error: ecommerceError } = await supabase
      .from('ecommerce_order_items')
      .select(`product_id, ecommerce_orders!inner(user_id, order_status)`) // Select required fields
      .eq('ecommerce_orders.user_id', user.id)
      .in('ecommerce_orders.order_status', ['processing', 'completed'])
      .not('product_id', 'is', null);

    if (ecommerceError) {
      console.error('[getOwnedProductIds] Error fetching ecommerce owned products:', ecommerceError);
      // Don't halt, try fetching Shopify orders, but log the error
    } else if (ecommerceItems) {
      ecommerceItems.forEach(item => {
        if (item.product_id) {
          ownedProductIds.add(item.product_id);
        }
      });
       console.log(`[getOwnedProductIds] Found ${ownedProductIds.size} owned items from ecommerce system.`);
    }

    // 2. Fetch from historical Shopify Orders
    // Need to link auth.users.id -> unified_profiles.id -> shopify_customers.id -> shopify_orders.customer_id
    const { data: profileData, error: profileError } = await supabase
        .from('unified_profiles')
        .select('id')
        .eq('id', user.id) // Assuming unified_profiles.id is the same as auth.users.id
        .maybeSingle();

    if (profileError) {
      console.error('[getOwnedProductIds] Error fetching unified profile for Shopify check:', profileError);
    } else if (profileData?.id) {
      const { data: customerData, error: customerError } = await supabase
          .from('shopify_customers')
          .select('id')
          .eq('unified_profile_id', profileData.id);

      if (customerError) {
          console.error('[getOwnedProductIds] Error fetching Shopify customer link:', customerError);
      } else if (customerData && customerData.length > 0) {
          const shopifyCustomerIds = customerData.map(c => c.id);
          
          // Query shopify_order_items joined with shopify_orders
          const { data: shopifyItems, error: shopifyError } = await supabase
            .from('shopify_order_items')
            .select(`product_id, shopify_orders!inner(customer_id, financial_status, fulfillment_status)`) // Select required fields
            .in('shopify_orders.customer_id', shopifyCustomerIds)
            // Filter for successful Shopify orders (adjust statuses as needed)
            .eq('shopify_orders.financial_status', 'paid') 
            // Could also check fulfillment_status if needed, e.g., .eq('shopify_orders.fulfillment_status', 'fulfilled')
            .not('product_id', 'is', null);

          if (shopifyError) {
            console.error('[getOwnedProductIds] Error fetching Shopify owned products:', shopifyError);
          } else if (shopifyItems) {
            const initialSize = ownedProductIds.size;
            shopifyItems.forEach(item => {
              if (item.product_id) {
                ownedProductIds.add(item.product_id);
              }
            });
            console.log(`[getOwnedProductIds] Added ${ownedProductIds.size - initialSize} owned items from Shopify system.`);
          }
      }
    }

    // 3. Return the unique list
    const finalOwnedIds = [...ownedProductIds];
    console.log(`[getOwnedProductIds] Returning total ${finalOwnedIds.length} unique owned product IDs.`);
    return finalOwnedIds;

  } catch (err) {
    console.error('[getOwnedProductIds] Unexpected error:', err);
    return []; // Return empty array on unexpected error
  }
} 