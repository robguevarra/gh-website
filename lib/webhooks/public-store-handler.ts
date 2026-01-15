
import { SupabaseClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service';
import { grantFilePermission } from '@/lib/google-drive/driveApiUtils';

// Define transaction interface
interface Transaction {
    id: string;
    user_id: string | null;
    transaction_type: string;
    contact_email: string | null;
    metadata: any;
    status: string;
    amount?: number;
    currency?: string;
    external_id?: string | null;
}

/**
 * Handles PUBLIC_STORE_SALE transactions (Guest Checkout).
 * 1. Iterates through cart items in metadata.
 * 2. Grants Google Drive permissions.
 * 3. Sends "Shopify Order Confirmation" email.
 */
export async function handlePublicStoreSale(tx: Transaction, supabase: SupabaseClient) {
    console.log(`[Webhook][PublicStore] Processing PUBLIC_STORE_SALE transaction: ${tx.id}`);

    const userEmail = tx.contact_email;
    // Ensure we have an email
    if (!userEmail) {
        console.error(`[Webhook][PublicStore] CRITICAL: No contact_email for transaction ${tx.id}. Aborting fulfillment.`);
        return;
    }

    // Extract Cart Items
    const specificMetadata = tx.metadata as { cartItems?: any[], firstName?: string, lastName?: string } | null;
    const cartItems = (specificMetadata && Array.isArray(specificMetadata.cartItems))
        ? specificMetadata.cartItems
        : null;

    if (!cartItems || cartItems.length === 0) {
        console.error(`[Webhook][PublicStore] CRITICAL: No valid 'cartItems' found in metadata for ${tx.id}. Aborting fulfillment.`);
        return;
    }

    // --- Grant Permissions Logic ---
    console.log(`[Webhook][PublicStore] Starting permission grant for ${userEmail}`);

    // Enrich items with Drive IDs from DB
    let enrichedCartItems = [...cartItems];

    try {
        const productIds = cartItems.map(item => item.productId || item.product_id).filter(Boolean);

        if (productIds.length > 0) {
            const { data: products, error } = await supabase
                .from('shopify_products')
                .select('id, title, featured_image_url, google_drive_file_id, handle')
                .in('id', productIds);

            if (error) {
                console.error('[Webhook][PublicStore] Error fetching product details:', error);
            } else if (products && products.length > 0) {
                const productMap = new Map(products.map(p => [p.id, p]));

                enrichedCartItems = cartItems.map(item => {
                    const productId = item.productId || item.product_id;
                    const productDetails = productId ? productMap.get(productId) : null;

                    if (productDetails) {
                        return {
                            ...item,
                            title: productDetails.title || item.title,
                            featured_image_url: productDetails.featured_image_url || item.imageUrl,
                            google_drive_file_id: productDetails.google_drive_file_id,
                            handle: productDetails.handle
                        };
                    }
                    return item;
                });
            }
        }
    } catch (err) {
        console.error('[Webhook][PublicStore] Error enriching items:', err);
    }

    // Iterate and grant permissions
    for (const item of enrichedCartItems) {
        try {
            const fileId = item.google_drive_file_id;
            if (fileId) {
                await grantFilePermission(fileId, userEmail, 'reader');
                console.log(`[Webhook][PublicStore] Granted access to ${fileId} for ${userEmail}`);
            } else {
                console.warn(`[Webhook][PublicStore] No Drive ID for item ${item.title}`);
            }
        } catch (grantError) {
            console.error(`[Webhook][PublicStore] Failed to grant permission for ${item.title}:`, grantError);
        }
    }

    // --- Send Email Logic ---
    try {
        const firstName = specificMetadata?.firstName || 'Friend';
        const orderNumber = tx.external_id || tx.id.substring(0, 8);

        // Format HTML for email (Shared logic with ECOM handler)
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

        const formattedItemsHtml = formatOrderItemsForEmail(enrichedCartItems);

        // TODO: Add Magic Link generation for upsell if desired (omitted for speed unless requested)
        const magicLink = '';
        const accountBenefits = 'Create an account to track your orders and access exclusive member benefits.';

        await sendTransactionalEmail(
            'Shopify Order Confirmation',
            userEmail,
            {
                first_name: firstName,
                order_number: orderNumber,
                order_items: formattedItemsHtml,
                total_amount: (tx.amount || 0).toFixed(2),
                currency: tx.currency || 'PHP',
                access_instructions: 'Your digital products have been delivered. Check your Google Drive access for each item.',
                magic_link: magicLink || undefined, // Template might hide it if empty
                expiration_hours: '48',
                customer_type: 'guest',
                account_benefits: accountBenefits
            }
        );
        console.log(`[Webhook][PublicStore] Order Confirmation email sent to ${userEmail}`);

    } catch (emailError) {
        console.error(`[Webhook][PublicStore] Failed to send email:`, emailError);
    }
}
