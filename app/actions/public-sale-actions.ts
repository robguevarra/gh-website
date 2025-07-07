"use server"

// PUBLIC_SALE payment action - Copied from Canva ebook pattern exactly
// This follows the proven minimal-risk approach

import { getAdminClient } from '@/lib/supabase/admin';
import { logTransaction } from './payment-utils';
import { extractAffiliateTrackingFromServerCookies } from '@/lib/services/affiliate/tracking-service';

// Define payment method types (same as existing)
export type PaymentMethod = "invoice" | "card" | "ewallet" | "direct_debit"

// Parameters for public sale payment
interface PublicSalePaymentParams {
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  email: string
  firstName: string
  lastName?: string | null
  phone?: string
  description?: string
  productCode: string  // NEW: identifies which product (e.g., 'pillow_talk')
  productName: string  // NEW: display name
  originalPrice?: number  // NEW: for tracking discount
  metadata?: Record<string, any>
}

// Response interface (same as existing)
interface PaymentResponse {
  id: string
  amount: number
  currency: string
  status: "pending" | "paid" | "failed" | "expired"
  invoice_url?: string
  error?: boolean
  message?: string
}

// Main function - Copy of createPaymentIntent but for PUBLIC_SALE transaction type
export async function createPublicSalePaymentIntent(params: PublicSalePaymentParams): Promise<PaymentResponse> {
  try {
    // Validate inputs (same as existing)
    if (!params.amount || params.amount <= 0) {
      throw new Error("Invalid payment amount")
    }

    if (!params.email) {
      throw new Error("Email is required")
    }

    if (!params.firstName) {
      throw new Error("First name is required")
    }

    if (!params.productCode) {
      throw new Error("Product code is required")
    }

    if (!params.productName) {
      throw new Error("Product name is required")
    }

    // Generate external ID (same pattern as existing)
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const externalId = `pub-${year}${month}${day}${hours}${minutes}${seconds}-${randomSuffix}`;

    // Get base URL (same as existing)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://graceful-homeschooling.vercel.app"

    // Prepare Xendit payload (adapted for public sale)
    const payload = {
      external_id: externalId,
      amount: params.amount / 100, // Convert from cents
      payer_email: params.email,
      description: params.description || params.productName,
      success_redirect_url: `${baseUrl}/payment-success?id=${externalId}`,
      failure_redirect_url: `${baseUrl}/payment-failure?id=${externalId}&error=failed`,
      currency: params.currency,
      payer_name: [params.firstName, params.lastName].filter(Boolean).join(' '),
      payer_phone: params.phone,
      items: [
        {
          name: params.productName,
          quantity: 1,
          price: params.amount / 100,
          category: "Digital Product",
        },
      ],
      // Metadata includes product information
      metadata: {
        ...params.metadata,
        payment_method: params.paymentMethod,
        source: "website",
        product_code: params.productCode,
        product_name: params.productName,
        original_price: params.originalPrice?.toString(),
        sale_price: params.amount.toString(),
      },
    }

    // Log request (same pattern as existing)
    console.log("[PublicSaleAction] Xendit API request initiated", {
      external_id: payload.external_id,
      amount: payload.amount,
      currency: payload.currency,
      product_code: params.productCode,
    })

    // Make Xendit API request (exact same call)
    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64")}`,
      },
      body: JSON.stringify(payload),
    })

    const responseData = await response.json()

    console.log("[PublicSaleAction] Xendit API response received", {
      id: responseData.id || "no-id",
      status: responseData.status || "unknown",
      invoice_url: responseData.invoice_url ? "URL received" : "No URL",
      external_id: responseData.external_id || externalId,
    })

    if (!response.ok) {
      console.error("Xendit API error:", responseData)
      throw new Error(`Payment processing failed: ${responseData.message || "Unknown error"}`)
    }

    // Log Transaction Locally with PUBLIC_SALE type
    try {
      // Extract affiliate tracking (same as existing)
      const { affiliateSlug, visitorId } = await extractAffiliateTrackingFromServerCookies();
      
      if (affiliateSlug && visitorId) {
        console.log(`[PublicSaleAction] Affiliate tracking captured: affiliate=${affiliateSlug}, visitor=${visitorId}`);
      } else {
        console.log('[PublicSaleAction] No affiliate tracking cookies found during checkout');
      }
      
      // Prepare metadata for logging
      interface TransactionMetadata {
        firstName: string;
        lastName?: string | null;
        product_code: string;
        product_name: string;
        original_price?: string;
        sale_price: string;
        affiliate_slug?: string;
        visitor_id?: string;
        affiliate_capture_time?: string;
        [key: string]: any;
      }

      const loggedMetadata: TransactionMetadata = {
        ...(params.metadata || {}),
        firstName: params.firstName,
        lastName: params.lastName,
        product_code: params.productCode,
        product_name: params.productName,
        original_price: params.originalPrice?.toString(),
        sale_price: params.amount.toString(),
        source: params.metadata?.source || 'website',
      };
      
      // Add affiliate tracking data
      if (affiliateSlug) loggedMetadata.affiliate_slug = affiliateSlug;
      if (visitorId) loggedMetadata.visitor_id = visitorId;
      if (affiliateSlug || visitorId) loggedMetadata.affiliate_capture_time = new Date().toISOString();

      // Clean metadata
      const metadataToClean: any = loggedMetadata;
      Object.keys(metadataToClean).forEach(key => 
        (metadataToClean[key] === undefined || metadataToClean[key] === null) && delete metadataToClean[key]
      );
      
      // Log transaction with PUBLIC_SALE type (this maps to 'ebook' in logTransaction but uses metadata to distinguish)
      const transaction = await logTransaction({
        transactionType: 'ebook', // Use existing 'ebook' type but metadata will have product_code
        userId: null, // No user ID at this stage
        email: params.email,
        amount: params.amount / 100,
        metadata: metadataToClean,
        externalId: externalId,
        paymentMethod: 'XENDIT',
        phone: params.phone
      });

      // Update transaction to PUBLIC_SALE type after logging
      if (transaction) {
        const supabase = getAdminClient();
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ transaction_type: 'PUBLIC_SALE' })
          .eq('id', transaction.id);

        if (updateError) {
          console.error('[PublicSaleAction] Failed to update transaction type to PUBLIC_SALE:', updateError);
        } else {
          console.log('[PublicSaleAction] Transaction type updated to PUBLIC_SALE');
        }
      }

      console.log("[PublicSaleAction] Transaction logged successfully");
    } catch (logError) {
      console.error("[PublicSaleAction] Failed to log transaction locally:", logError);
      // Continue with payment - local logging failure shouldn't block payment
    }

    // Return successful response (same format as existing)
    return {
      id: responseData.id,
      amount: responseData.amount,
      currency: responseData.currency,
      status: responseData.status,
      invoice_url: responseData.invoice_url,
    }
  } catch (error) {
    console.error("[PublicSaleAction] Payment intent creation failed:", error)
    return {
      id: "",
      amount: params.amount,
      currency: params.currency,
      status: "failed",
      error: true,
      message: error instanceof Error ? error.message : "Payment processing failed",
    }
  }
} 