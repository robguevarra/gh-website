'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';
import { v4 as uuidv4 } from 'uuid';

interface SyncResult {
    success: boolean;
    message: string;
    syncedOrderCount: number;
    errors: string[];
}

/**
 * Syncs old Shopify orders for a user into the new ecommerce_orders system.
 * This ensures users have access to digital products they purchased on the old store.
 */
export async function syncShopifyOrders(unifiedProfileId: string): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        message: '',
        syncedOrderCount: 0,
        errors: []
    };

    try {
        // 1. Validate Admin Access (Double check, though typically called from admin UI)
        const access = await validateAdminAccess();
        if ('error' in access) {
            throw new Error(`Unauthorized: ${access.error}`);
        }

        const adminClient = getAdminClient();

        // 2. Get linked Shopify customers for this user
        const { data: customers, error: customerError } = await adminClient
            .from('shopify_customers')
            .select('shopify_customer_id, id')
            .eq('unified_profile_id', unifiedProfileId);

        if (customerError) throw new Error(`Failed to fetch shopify customers: ${customerError.message}`);
        if (!customers || customers.length === 0) {
            result.success = true;
            result.message = 'No linked Shopify customers found for this user.';
            return result;
        }

        const customerIds = customers.map(c => c.shopify_customer_id);

        // 3. Fetch Shopify orders for these customers
        // We need to query by shopify_customer_id in the jsonb customer column OR likely just use the relationship if possible.
        // However, shopify_orders table usually has a customer_id column or we filter by the customer object.
        // Looking at the schema inspection earlier, shopify_orders has 'customer_id' (UUID relation) and 'email'.
        // Better to fetch by the linked local customer_ids.

        // First, let's get the local UUIDs of these customers from the shopify_customers table (already have in `customers`)
        const localCustomerIds = customers.map(c => c.id);

        const { data: orders, error: ordersError } = await adminClient
            .from('shopify_orders')
            .select('*')
            .in('customer_id', localCustomerIds)
            .eq('financial_status', 'paid'); // Only sync paid orders

        if (ordersError) throw new Error(`Failed to fetch shopify orders: ${ordersError.message}`);
        if (!orders || orders.length === 0) {
            result.success = true;
            result.message = 'No paid Shopify orders found to sync.';
            return result;
        }

        // 4. Iterate and Sync
        for (const order of orders) {
            try {
                const shopifyOrderId = order.shopify_order_id.toString();

                // Check if transaction already exists
                const { data: existingTx, error: txCheckError } = await adminClient
                    .from('transactions')
                    .select('id')
                    .eq('external_id', shopifyOrderId)
                    .maybeSingle();

                if (txCheckError) {
                    console.error(`Error checking transaction for order ${shopifyOrderId}:`, txCheckError);
                    result.errors.push(`Order ${order.order_number}: Failed to check existence`);
                    continue;
                }

                if (existingTx) {
                    // Check if this was a partial/failed sync (no ecommerce order items)
                    const { data: existingEcoOrder } = await adminClient
                        .from('ecommerce_orders')
                        .select('id, ecommerce_order_items(count)')
                        .eq('transaction_id', existingTx.id)
                        .maybeSingle();

                    const itemCount = existingEcoOrder?.ecommerce_order_items?.[0]?.count || 0;

                    if (itemCount === 0) {
                        console.log(`Order ${order.order_number} has incomplete sync (0 items). Re-syncing...`);

                        // Explicitly delete dependency first (ecommerce_orders)
                        const { error: delEcoErr } = await adminClient
                            .from('ecommerce_orders')
                            .delete()
                            .eq('transaction_id', existingTx.id);

                        if (delEcoErr) {
                            console.error('Failed to delete existing eco order during re-sync:', delEcoErr);
                            // If this fails, the next step (tx delete) might fail too, but we try anyway
                        }

                        // Delete the old transaction
                        const { error: delTxErr } = await adminClient
                            .from('transactions')
                            .delete()
                            .eq('id', existingTx.id);

                        if (delTxErr) {
                            console.error('Failed to delete existing transaction during re-sync:', delTxErr);
                            // If we couldn't delete, we can't insert a new one with same external_id
                            throw new Error(`Could not clear incomplete sync for order ${order.order_number}: ${delTxErr.message}`);
                        }

                        // Continue to creation
                    } else {
                        // Already synced and has items, skip
                        console.log(`Order ${order.order_number} (${shopifyOrderId}) already synced.`);
                        continue;
                    }
                }

                // --- Start Sync Process for this Order ---

                // A. Create Transaction
                const transactionId = uuidv4();
                const { error: insertTxError } = await adminClient
                    .from('transactions')
                    .insert({
                        id: transactionId,
                        user_id: unifiedProfileId,
                        amount: Number(order.total_price),
                        currency: order.currency || 'PHP',
                        status: 'completed', // It's a past paid order
                        transaction_type: 'SHOPIFY_IMPORT',
                        payment_method: 'SHOPIFY_LEGACY',
                        external_id: shopifyOrderId,
                        created_at: order.created_at, // Preserve original date
                        updated_at: new Date().toISOString(),
                        contact_email: order.email,
                        metadata: {
                            shopify_order_number: order.order_number,
                            shopify_tags: order.tags,
                            imported_at: new Date().toISOString(),
                            admin_id: access.user.id
                        }
                    });

                if (insertTxError) {
                    throw new Error(`Failed to create transaction: ${insertTxError.message}`);
                }

                // B. Create Ecommerce Order
                const ecommerceOrderId = uuidv4();
                const { error: insertEcoOrderError } = await adminClient
                    .from('ecommerce_orders')
                    .insert({
                        id: ecommerceOrderId,
                        user_id: unifiedProfileId,
                        unified_profile_id: unifiedProfileId,
                        transaction_id: transactionId,
                        order_status: 'completed',
                        total_amount: Number(order.total_price),
                        currency: order.currency || 'PHP',
                        payment_method: 'SHOPIFY_LEGACY',
                        created_at: order.created_at,
                        updated_at: new Date().toISOString()
                    } as any);

                if (insertEcoOrderError) {
                    // Rollback transaction if possible, or just throw (manual cleanup might be needed if strict atomicity required)
                    // For now, throwing will catch below.
                    throw new Error(`Failed to create ecommerce order: ${insertEcoOrderError.message}`);
                }

                // C. Process Order Items
                const { data: lineItems, error: itemsError } = await adminClient
                    .from('shopify_order_items')
                    .select('*')
                    .eq('order_id', order.id);

                if (itemsError) throw new Error(`Failed to fetch line items: ${itemsError.message}`);

                if (lineItems && lineItems.length > 0) {
                    for (const item of lineItems) {
                        // Find valid shopify product record
                        // item.shopify_product_id is likely the BigInt ID from Shopify
                        // We need the local UUID from shopify_products table

                        if (!item.shopify_product_id && !item.product_id) continue;

                        let product = null;

                        // Try by shopify_product_id first
                        if (item.shopify_product_id) {
                            const { data: p } = await adminClient
                                .from('shopify_products')
                                .select('id, title, google_drive_file_id')
                                .eq('shopify_product_id', item.shopify_product_id)
                                .maybeSingle();
                            product = p;
                        }

                        // Fallback to local product_id if not found or not available
                        if (!product && item.product_id) {
                            const { data: p } = await adminClient
                                .from('shopify_products')
                                .select('id, title, google_drive_file_id')
                                .eq('id', item.product_id)
                                .maybeSingle();
                            product = p;
                        }

                        // If product found locally, link it. If not, we can't grant access anyway, so skip.
                        if (product) {
                            const { error: itemInsertError } = await adminClient
                                .from('ecommerce_order_items')
                                .insert({
                                    order_id: ecommerceOrderId,
                                    product_id: product.id,
                                    quantity: item.quantity,
                                    price_at_purchase: item.price ? Number(item.price) : 0, // Fix: Handle null price
                                    currency: order.currency || 'PHP',
                                    product_snapshot: {
                                        title: item.title,
                                        original_shopify_id: item.shopify_product_id,
                                        imported: true
                                    }
                                } as any);

                            if (itemInsertError) {
                                console.error(`Failed to insert order item ${item.title}:`, itemInsertError);
                                // Don't fail the whole sync, just log
                                result.errors.push(`Order ${order.order_number}: Failed to link item ${item.title}`);
                            }
                        } else {
                            console.warn(`Product ${item.shopify_product_id} (${item.title}) not found locally. Skipping item.`);
                        }
                    }
                }

                result.syncedOrderCount++;

            } catch (orderSyncError: any) {
                console.error(`Error syncing order ${order.order_number}:`, orderSyncError);
                result.errors.push(`Order ${order.order_number}: ${orderSyncError.message}`);
            }
        }

        result.success = true;
        if (result.syncedOrderCount > 0) {
            result.message = `Successfully synced ${result.syncedOrderCount} orders.`;
        } else {
            result.message = 'No new orders required syncing.';
        }

    } catch (err: any) {
        console.error('Fatal error in syncShopifyOrders:', err);
        result.success = false;
        result.message = err.message || 'Internal server error during sync';
    }

    return result;
}
