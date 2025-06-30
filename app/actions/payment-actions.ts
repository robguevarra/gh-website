"use server"

// This is a server action to handle payment processing with Xendit

import { getAdminClient } from '@/lib/supabase/admin';
import { logTransaction } from './payment-utils'; // Import logTransaction
import { extractAffiliateTrackingFromServerCookies } from '@/lib/services/affiliate/tracking-service';

// Define payment method types
export type PaymentMethod = "invoice" | "card" | "ewallet" | "direct_debit"

// Update the PaymentIntentParams interface to include more options
interface PaymentIntentParams {
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  email: string
  firstName: string
  lastName?: string | null
  phone?: string
  description?: string
  metadata?: Record<string, any>
}

// Response interface for better type safety
interface PaymentResponse {
  id: string
  amount: number
  currency: string
  status: "pending" | "paid" | "failed" | "expired"
  invoice_url?: string
  error?: boolean
  message?: string
}

// Update the createPaymentIntent function to include phone in the payload
export async function createPaymentIntent(params: PaymentIntentParams): Promise<PaymentResponse> {
  try {
    // Validate inputs
    if (!params.amount || params.amount <= 0) {
      throw new Error("Invalid payment amount")
    }

    if (!params.email) {
      throw new Error("Email is required")
    }

    if (!params.firstName) {
      throw new Error("First name is required")
    }

    // Generate a unique external ID with timestamp for readability
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Pad month
    const day = now.getDate().toString().padStart(2, '0'); // Pad day
    const hours = now.getHours().toString().padStart(2, '0'); // Pad hours
    const minutes = now.getMinutes().toString().padStart(2, '0'); // Pad minutes
    const seconds = now.getSeconds().toString().padStart(2, '0'); // Pad seconds
    const randomSuffix = Math.random().toString(36).substring(2, 8); // Shorter suffix
    const externalId = `inv-${year}${month}${day}${hours}${minutes}${seconds}-${randomSuffix}`;
    // const externalId = `invoice-${Date.now()}-${Math.random().toString(36).substring(2, 10)}` // Old format

    // Get the base URL from environment variables or use a default
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://graceful-homeschooling.vercel.app"

    // Prepare the request payload for Xendit API
    const payload = {
      external_id: externalId,
      amount: params.amount / 100, // Convert from cents to whole currency units
      payer_email: params.email,
      description: params.description || "Papers to Profits Course Enrollment",
      success_redirect_url: `${baseUrl}/payment-success?id=${externalId}`,
      failure_redirect_url: `${baseUrl}/payment-failure?id=${externalId}&error=failed`,
      currency: params.currency,
      payer_name: [params.firstName, params.lastName].filter(Boolean).join(' '),
      payer_phone: params.phone,
      items: [
        {
          name: "Papers to Profits Course",
          quantity: 1,
          price: params.amount / 100,
          category: "Education",
        },
      ],
      // Add metadata for tracking
      metadata: {
        ...params.metadata,
        payment_method: params.paymentMethod,
        source: "website",
      },
    }

    // Log only non-sensitive info for debugging (do NOT log PII or secrets)
    console.log("[PaymentAction] Xendit API request initiated", {
      external_id: payload.external_id,
      amount: payload.amount,
      currency: payload.currency,
      // Do not log payer_email, payer_name, or any PII
    })

    // Make the API request to Xendit
    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64")}`,
      },
      body: JSON.stringify(payload),
    })

    // Get the response data
    const responseData = await response.json()

    // Log only non-sensitive info for debugging (do NOT log PII or secrets)
    console.log("[PaymentAction] Xendit API response received", {
      id: responseData.id || "no-id",
      status: responseData.status || "unknown",
      invoice_url: responseData.invoice_url ? "URL received" : "No URL",
      external_id: responseData.external_id || externalId,
    })

    if (!response.ok) {
      console.error("Xendit API error:", responseData)
      throw new Error(`Payment processing failed: ${responseData.message || "Unknown error"}`)
    }

    // --- Log Transaction Locally --- 
    try {
      // Extract affiliate tracking cookies from server-side session
      const { affiliateSlug, visitorId } = await extractAffiliateTrackingFromServerCookies();
      
      // Log affiliate tracking capture for debugging
      if (affiliateSlug && visitorId) {
        console.log(`[PaymentAction] Affiliate tracking captured: affiliate=${affiliateSlug}, visitor=${visitorId}`);
      } else {
        console.log('[PaymentAction] No affiliate tracking cookies found during checkout');
      }
      
      // Determine transaction type (assuming 'course' if description includes it)
      const transactionType = params.description?.includes("Course") ? 'course' : 'ebook';
      
      // Define a more complete interface for metadata to avoid type errors
      interface TransactionMetadata {
        firstName: string;
        lastName?: string | null;
        courseId?: string;
        promo_code?: string;
        source?: string;
        plan?: string;
        affiliate_slug?: string;
        visitor_id?: string;
        affiliate_capture_time?: string;
        // Add any other properties that might be in params.metadata
        [key: string]: any;
      }

      // Prepare metadata for logging with proper typing
      const loggedMetadata: TransactionMetadata = {
        ...(params.metadata || {}),
        firstName: params.firstName,
        lastName: params.lastName,
        // Ensure courseId is included if available in input metadata
        courseId: params.metadata?.course_id,
        // Add other relevant fields from params.metadata if needed
        promo_code: params.metadata?.promo_code,
        source: params.metadata?.source || 'website',
        plan: params.metadata?.plan,
      };
      
      // Flatten affiliate tracking data to avoid potential JSON parsing issues
      if (affiliateSlug) loggedMetadata.affiliate_slug = affiliateSlug;
      if (visitorId) loggedMetadata.visitor_id = visitorId;
      if (affiliateSlug || visitorId) loggedMetadata.affiliate_capture_time = new Date().toISOString();

      // Debug log to check metadata structure before cleanup
      console.log('[PaymentAction] Metadata before cleanup:', {
        hasAffiliateData: !!affiliateSlug,
        metadataKeys: Object.keys(loggedMetadata),
        transactionType,
      });

      // Remove null/undefined values from metadata before logging
      // Cast to any to allow dynamic key access for cleanup
      const metadataToClean: any = loggedMetadata;
      Object.keys(metadataToClean).forEach(key => 
        (metadataToClean[key] === undefined || metadataToClean[key] === null) && delete metadataToClean[key]
      );
      
      // Attempt to log transaction
      try {
        const transaction = await logTransaction({
          transactionType: transactionType,
          userId: null, // No user ID at this stage
          email: params.email,
          amount: params.amount / 100, // Convert to base unit before logging
          metadata: metadataToClean, // Use cleaned metadata
          externalId: externalId, // MUST use the locally generated externalId
          paymentMethod: 'XENDIT', // Add specific payment method
          phone: params.phone // Pass phone number
        });
        
        console.log(`[PaymentAction] Successfully logged initial transaction for externalId: ${externalId}`);
        
      } catch (txError: any) {
        // Detailed error logging for transaction issues
        console.error(`[PaymentAction] CRITICAL: Failed to log transaction:`, {
          error: txError?.message || 'Unknown error',
          externalId,
          errorDetails: txError?.toString?.() || 'No details',
        });
        
        // Try a simpler version with minimal metadata as fallback
        try {
          console.log('[PaymentAction] Attempting simplified transaction logging fallback...');
          await logTransaction({
            transactionType: transactionType,
            userId: null,
            email: params.email,
            amount: params.amount / 100,
            metadata: { 
              firstName: params.firstName,
              affiliate_slug: affiliateSlug
            },
            externalId: externalId,
            paymentMethod: 'XENDIT',
            phone: null
          });
          console.log(`[PaymentAction] Fallback transaction logging succeeded for externalId: ${externalId}`);
        } catch (fallbackError: any) {
          console.error(`[PaymentAction] Even simplified transaction logging failed:`, {
            error: fallbackError?.message || 'Unknown error',
            externalId
          });
          // We still continue as this shouldn't block the payment flow
        }
      }
    } catch (logError: any) {
      console.error(`[PaymentAction] CRITICAL: Failed in transaction logging flow:`, {
        error: logError?.message || 'Unknown error',
        externalId,
        stack: logError?.stack
      });
      // We still continue as this shouldn't block the payment flow
    }
    // --- End Log Transaction Locally ---

    // Return the invoice URL and other details for redirection
    return {
      id: responseData.id || externalId,
      amount: params.amount,
      currency: params.currency,
      status: "pending",
      invoice_url: responseData.invoice_url,
    }
  } catch (error) {
    console.error("Payment processing error:", error)

    // Return a sanitized error to the client
    return {
      id: "",
      amount: params.amount,
      currency: params.currency,
      status: "failed",
      error: true,
      message: error instanceof Error ? error.message : "Payment processing failed. Please try again later.",
    }
  }
}

// Function to verify a webhook signature from Xendit
export async function verifyWebhookSignature(payload: any, signature: string): Promise<boolean> {
  try {
    // In a real implementation, you would verify the signature using crypto
    // This is a placeholder for the actual implementation
    const webhookSecret = process.env.XENDIT_WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.error("Webhook secret not configured")
      return false
    }
    
    // For now, we'll just return true in development
    // In production, implement proper signature verification
    return true
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return false
  }
}

// Function to handle payment status updates
export async function updatePaymentStatus(paymentId: string, status: string): Promise<boolean> {
  // Use Supabase admin client for secure server-side DB access
  const supabase = getAdminClient();

  // Map incoming status to normalized enum
  // 'paid' (from Xendit) should be stored as 'completed' in our schema
  const normalizedStatus = status === 'paid' ? 'completed' : status;

  try {
    // Prepare update object
    const updateObj: Record<string, any> = { status: normalizedStatus };
    // If status is 'completed', set paid_at to now (ISO string)
    if (normalizedStatus === 'completed') {
      updateObj.paid_at = new Date().toISOString();
    }

    // Update the transaction by external_id (Xendit paymentId)
    const { error, data } = await supabase
      .from('transactions')
      .update(updateObj)
      .eq('external_id', paymentId)
      .select();

    if (error) {
      console.error(`Failed to update payment status for ${paymentId}:`, error);
      return false;
    }

    // Log for audit/debugging
    console.log(
      `Payment ${paymentId} status updated to ${normalizedStatus}` +
        (normalizedStatus === 'completed' ? ' and paid_at set.' : '.')
    );

    return true;
  } catch (error) {
    // Log unexpected errors
    console.error('Failed to update payment status:', error);
    return false;
  }
}

// --- New Server Action to Fetch Transaction --- 

// Update TransactionDetails interface to include order and items
export interface TransactionDetails {
  id: string;
  external_id: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  created_at: string | null;
  paid_at: string | null;
  metadata: { 
    firstName?: string;
    lastName?: string;
    courseId?: string;
    plan?: string;
    [key: string]: any;
  } | null;
  // Add nested structure for e-commerce orders
  ecommerce_orders?: {
    id: string; // orderId
    ecommerce_order_items: {
        id: string; // itemId
        quantity: number;
        price_at_purchase: number;
        shopify_products: {
            id: string; // productId
            title: string | null;
            google_drive_file_id: string | null;
        } | null; // Product might be null if deleted?
    }[];
  }[] | null; // Transaction might have multiple orders? Unlikely but possible schema-wise. Usually one.
}

/**
 * Fetches transaction details by external_id, including related e-commerce order items and product info.
 * @param externalId The external identifier (e.g., from Xendit invoice).
 * @returns Transaction details with nested order items or null if not found.
 */
export async function getTransactionByExternalId(
  externalId: string
): Promise<TransactionDetails | null> {
  if (!externalId) {
    console.warn('getTransactionByExternalId called with no externalId');
    return null;
  }

  const supabase = getAdminClient();

  // Update query to fetch related ecommerce order data
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      external_id,
      status,
      amount,
      currency,
      created_at,
      paid_at,
      metadata,
      ecommerce_orders (
        id,
        ecommerce_order_items (
          id,
          quantity,
          price_at_purchase,
          shopify_products (
            id,
            title,
            google_drive_file_id
          )
        )
      )
    `)
    .eq('external_id', externalId)
    .maybeSingle(); // Assuming one transaction per external ID

  if (error) {
    console.error(`Error fetching transaction details for externalId ${externalId}:`, error);
    return null;
  }

  if (!data) {
    console.log(`No transaction found for externalId ${externalId}`);
    return null;
  }

  // Cast the result to the updated interface type
  return data as TransactionDetails;
}

// Example usage (not part of the action itself)
/*
async function example() {
  const details = await getTransactionByExternalId('some-external-id');
  if (details && details.ecommerce_orders && details.ecommerce_orders.length > 0) {
    const order = details.ecommerce_orders[0];
    order.ecommerce_order_items.forEach(item => {
      console.log('Item:', item.shopify_products?.title);
      if (item.shopify_products?.google_drive_file_id) {
        console.log('Access Link/ID:', item.shopify_products.google_drive_file_id);
      }
    });
  }
}
*/

