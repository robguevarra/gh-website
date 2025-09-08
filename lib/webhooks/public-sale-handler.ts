// PUBLIC_SALE webhook handler - Copied from Canva ebook pattern exactly
// This follows the proven minimal-risk approach

import { SupabaseClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service';
import { storeEbookContactInfo } from '@/app/actions/payment-utils';

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
      
      // Send product delivery email (generalized for SHOPIFY_ECOM)
      try {
        const metadata = tx.metadata as any || {};
        const firstName = metadata.firstName || 'Friend';
        const productCode = metadata.product_code || metadata.product_handle || 'unknown';

        // Resolve Google Drive link from DB when possible (prefer DB over env)
        let resolvedDriveLink: string | null = null;
        try {
          // Try resolve by handle first
          if (productCode && productCode !== 'unknown') {
            const { data: byHandle, error: byHandleErr } = await supabase
              .from('shopify_products')
              .select('google_drive_file_id, title')
              .eq('handle', productCode)
              .limit(1)
              .maybeSingle();
            if (!byHandleErr && byHandle?.google_drive_file_id) {
              resolvedDriveLink = `https://drive.google.com/drive/folders/${byHandle.google_drive_file_id}`;
            }
          }
          // Fallback: resolve by product_id from metadata
          if (!resolvedDriveLink && metadata.product_id) {
            const { data: byId, error: byIdErr } = await supabase
              .from('shopify_products')
              .select('google_drive_file_id, title')
              .eq('id', metadata.product_id)
              .limit(1)
              .maybeSingle();
            if (!byIdErr && byId?.google_drive_file_id) {
              resolvedDriveLink = `https://drive.google.com/drive/folders/${byId.google_drive_file_id}`;
            }
          }
        } catch (resolveErr) {
          console.error('[Webhook][PublicSale] Failed resolving product drive link:', resolveErr);
        }
        
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
        
        switch (productCode) {
          case 'pillow_talk':
            templateName = 'Pillow Talk License Delivery';
            emailVariables = {
              first_name: firstName,
              download_link: resolvedDriveLink || process.env.PILLOW_TALK_DRIVE_LINK || 'https://drive.google.com/file/d/example',
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
              download_link: resolvedDriveLink || process.env.TEACHER_GIFT_SET_DRIVE_LINK || 'https://drive.google.com/drive/folders/1YmU-6znwqG0fL6mkOZ2NCpjxx-hfRfEf',
              ebook_title: 'Teacher Gift Set',
              order_number: tx.external_id || tx.id.substring(0, 8),
              access_instructions: 'Your ready‑to‑print files, Canva editable link, and print guide are in the Drive folder. Save a copy to your own Drive for editing.'
            };
            break;
          default:
            // Fallback for unknown products
            templateName = 'Pillow Talk License Delivery'; // Reuse existing generic template
            emailVariables = {
              first_name: firstName,
              download_link: resolvedDriveLink || process.env.PUBLIC_SALE_DEFAULT_LINK || 'https://drive.google.com/file/d/example',
              ebook_title: metadata.product_name || 'Digital Product',
              order_number: tx.external_id || tx.id.substring(0, 8),
              access_instructions: 'Your digital product has been delivered to your email.'
            };
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
            .update({ delivered_at: new Date().toISOString(), drive_link: emailVariables.download_link || null })
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