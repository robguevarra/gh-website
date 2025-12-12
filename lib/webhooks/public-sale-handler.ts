// PUBLIC_SALE webhook handler - Copied from Canva ebook pattern exactly
// This follows the proven minimal-risk approach

import { SupabaseClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service';
import { storeEbookContactInfo } from '@/app/actions/payment-utils';
import { grantFilePermission } from '@/lib/google-drive/driveApiUtils';
import { ADVENT_DAYS } from '@/lib/advent-config';

// Define transaction interface (same as existing webhook)
interface Transaction {
  id: string;
  user_id: string | null;
  transaction_type: string;
  contact_email: string | null;
  metadata: any;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  amount?: number;
  currency?: string;
  external_id?: string | null;
}

// Main handler function - Copy of Canva ebook logic
export async function handlePublicSaleTransaction(tx: Transaction, supabase: SupabaseClient) {
  console.log(`[Webhook][PublicSale] Processing PUBLIC_SALE transaction: ${tx.id}`);

  // Store contact info (same pattern as Canva)
  try {
    const emailToStore = tx.contact_email;
    if (emailToStore && typeof emailToStore === 'string') {
      const validatedEmail = emailToStore;

      // Store contact info (same as Canva but for public sale)
      try {
        await storeEbookContactInfo({
          email: validatedEmail,
          metadata: (typeof tx.metadata === 'object' && tx.metadata !== null) ? tx.metadata : {},
        });
        console.log("[Webhook][PublicSale] Contact info stored successfully");
      } catch (contactStoreError) {
        console.error("[Webhook][PublicSale] Failed to store contact info, but continuing with email delivery:", contactStoreError);
      }

      // Store order details in public_sale_orders table
      try {
        const metadata = tx.metadata as any || {};
        const firstName = metadata.firstName || 'Customer';
        const lastName = metadata.lastName || '';
        const customerName = [firstName, lastName].filter(Boolean).join(' ');

        // Insert into public_sale_orders table
        const orderData = {
          transaction_id: tx.id,
          product_code: metadata.product_code || 'unknown',
          product_name: metadata.product_name || 'Public Sale Product',
          customer_email: validatedEmail,
          customer_name: customerName,
          customer_phone: metadata.phone || null,
          original_price: parseInt(metadata.original_price || '0'),
          sale_price: parseInt(metadata.sale_price || '0'),
          delivery_method: 'email',
          drive_link: null, // Will be set based on product
          utm_source: metadata.utm_source || null,
          utm_campaign: metadata.utm_campaign || null,
          utm_medium: metadata.utm_medium || null,
        };

        const { error: orderError } = await supabase
          .from('public_sale_orders')
          .insert(orderData);

        if (orderError) {
          console.error("[Webhook][PublicSale] Failed to store order details:", orderError);
        } else {
          console.log("[Webhook][PublicSale] Order details stored successfully");
        }
      } catch (orderStoreError) {
        console.error("[Webhook][PublicSale] Failed to store order details:", orderStoreError);
      }

      // Apply product-specific tag (same pattern as Canva)
      try {
        if (tx.user_id) {
          const metadata = tx.metadata as any || {};
          const productCode = metadata.product_code || 'unknown';

          // Map product codes to tag names
          let tagName = '';
          switch (productCode) {
            case 'pillow_talk':
              tagName = 'Pillow Talk Purchase';
              break;
            case 'teacher_gift_set':
              tagName = 'Teacher Gift Set Purchase';
              break;
            case 'spiritual_life_planner':
              tagName = 'Spiritual Life Planner Purchase';
              break;
            default:
              tagName = 'Public Sale Purchase';
          }

          // Get the tag ID
          const { data: productTag, error: tagError } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .single();

          if (tagError || !productTag) {
            console.error(`[Webhook][PublicSale] Failed to find '${tagName}' tag:`, tagError || 'Tag not found');
          } else {
            // Import the tags module
            const { assignTagsToUsers } = await import('@/lib/supabase/data-access/tags');

            // Assign the tag to the user
            await assignTagsToUsers({
              tagIds: [productTag.id],
              userIds: [tx.user_id]
            });

            console.log(`[Webhook][PublicSale] Successfully tagged user ${tx.user_id} with '${tagName}'`);
          }
        } else {
          console.warn("[Webhook][PublicSale] Cannot apply tag - no user_id available");
        }
      } catch (tagError) {
        console.error("[Webhook][PublicSale] Failed to tag user:", tagError);
        // Don't throw - tagging failure shouldn't break payment processing
      }

      // Send product delivery email (same pattern as Canva)
      try {
        const metadata = tx.metadata as any || {};
        const firstName = metadata.firstName || 'Friend';
        const productCode = metadata.product_code || 'unknown';

        // Update lead status if leadId exists in metadata (same as Canva)
        const leadId = metadata.lead_id;
        if (leadId) {
          try {
            const { error: leadUpdateError } = await supabase
              .from('purchase_leads')
              .update({
                status: 'payment_completed',
                last_activity_at: new Date().toISOString(),
                converted_at: new Date().toISOString()
              })
              .eq('id', leadId);

            if (leadUpdateError) {
              console.error("[Webhook][PublicSale] Failed to update lead status:", leadUpdateError);
            } else {
              console.log("[Webhook][PublicSale] Lead status updated to payment_completed");
            }
          } catch (leadUpdateError) {
            console.error("[Webhook][PublicSale] Failed to update lead status:", leadUpdateError);
          }
        }

        // Map product codes to templates and variables
        let templateName = '';
        let emailVariables: Record<string, any> = {};

        // Check for Advent Sale items (check if handle exists in config)
        const isAdventProduct = ADVENT_DAYS.some(day => day.shopifyHandle === productCode);

        if (isAdventProduct) {
          console.log(`[Webhook][PublicSale] Detected Advent Sale product: ${productCode}`);
          try {
            // 1. Fetch product details from DB to get Drive ID and Title
            // We use the productCode as the handle
            const { data: productData, error: productError } = await supabase
              .from('shopify_products')
              .select('id, title, google_drive_file_id')
              .eq('handle', productCode)
              .maybeSingle();

            if (productError) {
              console.error(`[Webhook][PublicSale] Error fetching advent product ${productCode}:`, productError);
            }

            if (productData && productData.google_drive_file_id) {
              // 2. Grant Permission
              try {
                await grantFilePermission(productData.google_drive_file_id, validatedEmail, 'reader');
                console.log(`[Webhook][PublicSale] Granted Drive access (reader) for ${productCode} to ${validatedEmail}`);
              } catch (e) {
                const errMsg = e instanceof Error ? e.message : 'Unknown error';
                console.error(`[Webhook][PublicSale] Failed to grant Drive access:`, errMsg);
              }

              // 3. Set Email Variables
              // Look up in Advent Config first
              const adventDayConfig = ADVENT_DAYS.find(day => day.shopifyHandle === productCode);

              if (adventDayConfig?.emailTemplate) {
                templateName = adventDayConfig.emailTemplate;
                console.log(`[Webhook][PublicSale] Using configured Advent template: ${templateName}`);
              } else {
                templateName = 'Advent Product Delivery';
                console.log(`[Webhook][PublicSale] Using default Advent template: ${templateName}`);
              }

              emailVariables = {
                first_name: firstName,
                download_link: `https://drive.google.com/drive/folders/${productData.google_drive_file_id}`,
                ebook_title: productData.title,
                order_number: tx.external_id || tx.id.substring(0, 8),
                access_instructions: 'Your Advent surprise has been unlocked! Access your files via the link below.'
              };
            } else {
              console.warn(`[Webhook][PublicSale] Advent product not found or missing Drive ID for handle: ${productCode}. Sending fallback email.`);
              // Fallback based on config or generic
              const adventDayConfig = ADVENT_DAYS.find(day => day.shopifyHandle === productCode);
              if (adventDayConfig?.emailTemplate) {
                templateName = adventDayConfig.emailTemplate;
              } else {
                templateName = 'Pillow Talk License Delivery'; // Fallback logic
              }

              emailVariables = {
                first_name: firstName,
                download_link: process.env.PUBLIC_SALE_DEFAULT_LINK || 'https://drive.google.com/file/d/example',
                ebook_title: metadata.product_name || 'Advent Surprise',
                order_number: tx.external_id || tx.id.substring(0, 8),
                access_instructions: 'Your digital product is ready. Please contact support if you have issues accessing it.'
              };
            }
          } catch (adventHandlerError) {
            console.error(`[Webhook][PublicSale] Unexpected error in Advent handler:`, adventHandlerError);
            throw adventHandlerError;
          }
        } else {
          // Standard Product Switch Case
          switch (productCode) {
            case 'pillow_talk':
              templateName = 'Pillow Talk License Delivery';
              emailVariables = {
                first_name: firstName,
                download_link: process.env.PILLOW_TALK_DRIVE_LINK || 'https://drive.google.com/file/d/example',
                ebook_title: 'Pillow Talk: A Married Couple\'s Intimacy Planner',
                order_number: tx.external_id || tx.id.substring(0, 8),
                access_instructions: 'Your commercial license has been delivered to your Google Drive. You can now use these templates for your own business!'
              };
              break;
            case 'teacher_gift_set':
              // Use dedicated Teacher Gift Set template
              templateName = 'Teacher Gift Set Delivery';
              emailVariables = {
                first_name: firstName,
                download_link: process.env.TEACHER_GIFT_SET_DRIVE_LINK || 'https://drive.google.com/drive/folders/1YmU-6znwqG0fL6mkOZ2NCpjxx-hfRfEf',
                ebook_title: 'Teacher Gift Set',
                order_number: tx.external_id || tx.id.substring(0, 8),
                access_instructions: 'Your ready‑to‑print files, Canva editable link, and print guide are in the Drive folder. Save a copy to your own Drive for editing.'
              };
              break;
            case 'spiritual_life_planner':
              // Use dedicated Spiritual Life Planner template
              templateName = 'Spiritual Life Planner Delivery';
              emailVariables = {
                first_name: firstName,
                download_link: process.env.SPIRITUAL_LIFE_PLANNER_DRIVE_LINK || 'https://drive.google.com/drive/folders/12Qo58wGuaInUbE1L2ptvHDmSYCEK3tCP',
                ebook_title: 'Spiritual Life Planner',
                order_number: tx.external_id || tx.id.substring(0, 8),
                access_instructions: 'Your complete digital planner with all organizational and spiritual sections is ready! Save a copy to your own Drive and start your journey toward intentional living.'
              };
              break;
            default:
              // Fallback for unknown products
              templateName = 'Pillow Talk License Delivery'; // Use same template as fallback
              emailVariables = {
                first_name: firstName,
                download_link: process.env.PUBLIC_SALE_DEFAULT_LINK || 'https://drive.google.com/file/d/example',
                ebook_title: metadata.product_name || 'Digital Product',
                order_number: tx.external_id || tx.id.substring(0, 8),
                access_instructions: 'Your digital product has been delivered to your email.'
              };
          }
        }

        // Send delivery email
        await sendTransactionalEmail(
          templateName,
          validatedEmail,
          emailVariables,
          leadId
        );
        console.log(`[Webhook][PublicSale] Product delivery email sent successfully using template: ${templateName}`);

        // Update delivery timestamp
        try {
          await supabase
            .from('public_sale_orders')
            .update({ delivered_at: new Date().toISOString() })
            .eq('transaction_id', tx.id);
          console.log("[Webhook][PublicSale] Delivery timestamp updated");
        } catch (deliveryUpdateError) {
          console.error("[Webhook][PublicSale] Failed to update delivery timestamp:", deliveryUpdateError);
        }

      } catch (emailError) {
        console.error("[Webhook][PublicSale] Failed to send delivery email:", emailError);
        // Don't throw - email failure shouldn't break payment processing
      }
    } else {
      console.warn("[Webhook][PublicSale] Skipping contact storage because contact_email is null or not a string.");
    }
  } catch (err) {
    console.error("[Webhook][PublicSale] Failed to process PUBLIC_SALE transaction:", err);
    throw err; // Re-throw to indicate processing failure
  }
} 