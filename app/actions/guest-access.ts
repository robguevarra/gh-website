'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service';
import { formatCurrencyPHP } from '@/lib/utils/formatting';

// --- Logic Copied from lib/webhooks/public-store-handler.ts ---
const formatOrderItemsForEmail = (items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return '<p style="font-style: italic; color: #6b7280;">No items found.</p>';
    }

    let htmlOutput = `
    <div style="margin-bottom: 24px; background-color: #f5f9fa; border-radius: 8px; padding: 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding-bottom: 12px;">
            <p style="font-size: 14px; font-weight: 600; color: #b08ba5; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
              ITEMS (${items.length})
            </p>
          </td>
        </tr>
    `;

    items.forEach((item, index) => {
        const title = item.title || 'Product';
        // Logic from webhook: use featured_image_url OR imageUrl
        const imageUrl = item.featured_image_url || item.imageUrl || null;
        const googleDriveFileId = item.google_drive_file_id || null;

        const imageDisplayHtml = imageUrl
            ? `<img src="${imageUrl}" alt="${title}" width="64" height="64" style="object-fit: cover; border-radius: 6px; border: 1px solid #f1b5bc33;" />`
            : `<div style="width: 64px; height: 64px; background-color: #f1b5bc1a; border-radius: 6px; border: 1px solid #f1b5bc33; text-align: center; line-height: 64px;">📷</div>`;

        const driveButtonHtml = googleDriveFileId
            ? `<a href="https://drive.google.com/drive/folders/${googleDriveFileId}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 500; text-decoration: none; color: white; background-color: #b98ba5; border-radius: 6px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="margin-right: 6px;">📁</span>Open Folder</a>`
            : `<span style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #6b7280; background-color: #f3f4f6; border-radius: 6px; text-align: center;">Processing...</span>`;

        htmlOutput += `
      <tr>
        <td style="padding: 16px 0; ${index < items.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''}">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="72" valign="top">
                ${imageDisplayHtml}
              </td>
              <td style="padding: 0 16px;" valign="top">
                <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 500; color: #111827;">
                  ${title}
                </p>
              </td>
              <td align="right" valign="middle">
                ${driveButtonHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `;
    });

    htmlOutput += `</table></div>`;
    return htmlOutput;
};

// --- End Copied Logic ---

export async function getGuestOrders(email: string) {
    if (!email) return [];

    const supabase = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // 1. Get Profile ID
    const { data: profile } = await supabase
        .from('unified_profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

    let orders: any[] = [];
    const processedOrderIds = new Set();

    // 2. Fetch Ecommerce Orders (Modern)
    if (profile) {
        const { data: ecomOrders } = await supabase
            .from('ecommerce_orders')
            .select(`
                id, total_amount, currency, created_at, order_status, order_number
            `)
            .eq('unified_profile_id', profile.id)
            .order('created_at', { ascending: false });

        if (ecomOrders) {
            ecomOrders.forEach(o => {
                orders.push(o);
                processedOrderIds.add(o.id);
            });
        }
    }

    // 3. Fallback: Search Transactions directly
    const { data: rawTransactions } = await supabase
        .from('transactions')
        .select('id, created_at, status, metadata, external_id')
        .eq('contact_email', cleanEmail)
        .eq('status', 'paid');

    if (rawTransactions) {
        for (const tx of rawTransactions) {
            if (processedOrderIds.has(tx.id)) continue;

            let total = 0;
            const meta: any = tx.metadata || {};

            if (meta.total_amount) {
                total = Number(meta.total_amount);
            }
            else if (meta.cartItems && Array.isArray(meta.cartItems)) {
                total = meta.cartItems.reduce((acc: number, item: any) => acc + (item.price_at_purchase || 0) * (item.quantity || 1), 0);
            }

            // Prefer order number from external_id, fallback to ID
            const orderNum = tx.external_id || tx.id;

            orders.push({
                id: tx.id,
                total_amount: total,
                currency: 'PHP',
                created_at: tx.created_at || new Date().toISOString(),
                order_status: tx.status,
                order_number: orderNum, // Return clean ID here
                is_transaction_only: true
            });
        }
    }

    return orders.map(order => {
        const orderNum = order.order_number || order.id;
        // Logic for masking
        const maskedNumber = `****-${orderNum.slice(-4).toUpperCase()}`;

        return {
            id: order.id,
            date: order.created_at,
            total: order.total_amount,
            status: order.order_status,
            maskedNumber: maskedNumber,
            isTransaction: order.is_transaction_only
        };
    });
}

export async function resendOrderConfirmation(orderId: string, email: string) {
    const supabase = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Helper to enrich items with Sync Data (Image, Drive ID)
    const enrichItems = async (items: any[]) => {
        const enriched = [...items];
        // Collect product IDs to fetch
        const productIds = enriched.map(i => i.productId || i.product_id).filter(Boolean);

        if (productIds.length > 0) {
            const { data: products } = await supabase
                .from('shopify_products')
                .select('id, title, featured_image_url, google_drive_file_id')
                .in('id', productIds);

            if (products) {
                const productMap = new Map(products.map(p => [p.id, p]));
                return enriched.map(item => {
                    const pid = item.productId || item.product_id;
                    const details = productMap.get(pid);
                    if (details) {
                        return {
                            ...item,
                            title: details.title || item.title,
                            featured_image_url: details.featured_image_url || item.image || item.imageUrl,
                            google_drive_file_id: details.google_drive_file_id
                        };
                    }
                    return item;
                });
            }
        }
        return enriched;
    };

    // 1. Try to find Modern Order
    const { data: profile } = await supabase
        .from('unified_profiles')
        .select('id, first_name')
        .eq('email', cleanEmail)
        .maybeSingle();

    if (profile) {
        const { data: order } = await supabase
            .from('ecommerce_orders')
            .select(`*, ecommerce_order_items( *, products(title) )`)
            .eq('id', orderId)
            .eq('unified_profile_id', profile.id)
            .maybeSingle();

        if (order) {
            let items = order.ecommerce_order_items.map((item: any) => ({
                title: item.products?.title || 'Unknown Product',
                quantity: item.quantity,
                price_at_purchase: item.price_at_purchase,
                product_id: item.product_id,
            }));

            items = await enrichItems(items);

            const variables = {
                first_name: profile.first_name || 'Customer',
                email: cleanEmail,
                order_number: order.order_number || order.id.slice(0, 8).toUpperCase(),
                currency: '₱',
                total_amount: order.total_amount?.toFixed(2) || '0.00',
                order_items: formatOrderItemsForEmail(items),
                access_instructions: 'Your digital products have been delivered. Check your Google Drive access for each item.',
                customer_type: 'guest',
            };
            return sendTransactionalEmail('Shopify Order Confirmation', cleanEmail, variables);
        }
    }

    // 2. Try to find Transaction Direct (Fallback)
    const { data: tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', orderId)
        .eq('contact_email', cleanEmail)
        .maybeSingle();

    if (tx) {
        const meta: any = tx.metadata || {};
        let total = 0;
        let items = [];

        if (meta.cartItems && Array.isArray(meta.cartItems)) {
            items = meta.cartItems.map((item: any) => ({
                title: item.title || item.productTitle || 'Digital Product',
                quantity: item.quantity || 1,
                price: item.price_at_purchase || item.price || 0,
                productId: item.productId,
                imageUrl: item.image || item.imageUrl
            }));
            total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        }

        items = await enrichItems(items);

        // Use external_id (e.g. pub-sale-...) as order number if available
        const orderNumber = tx.external_id || tx.id.slice(0, 8).toUpperCase();

        const variables = {
            first_name: meta.firstName || 'Customer',
            email: cleanEmail,
            order_number: orderNumber, // Fixed: Uses actual transaction ID
            currency: '₱',
            total_amount: total.toFixed(2),
            order_items: formatOrderItemsForEmail(items),
            access_instructions: 'Your digital products have been delivered. Check your Google Drive access for each item.',
            customer_type: 'guest',
        };
        return sendTransactionalEmail('Shopify Order Confirmation', cleanEmail, variables);
    }

    return { error: 'Order not found.' };
}
