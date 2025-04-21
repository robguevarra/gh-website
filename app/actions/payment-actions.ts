"use server"

// This is a server action to handle payment processing with Xendit

import { getAdminClient } from '@/lib/supabase/admin';

// Define payment method types
export type PaymentMethod = "invoice" | "card" | "ewallet" | "direct_debit"

// Update the PaymentIntentParams interface to include more options
interface PaymentIntentParams {
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  email: string
  name: string
  phone?: string
  description?: string
  metadata?: Record<string, string>
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

    if (!params.name) {
      throw new Error("Name is required")
    }

    // Generate a unique external ID for this transaction
    const externalId = `invoice-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`

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
      payer_name: params.name,
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

    // Log the request for debugging (remove sensitive data in production)
    console.log("Xendit API request payload:", {
      external_id: payload.external_id,
      amount: payload.amount,
      payer_email: payload.payer_email,
      description: payload.description,
      currency: payload.currency,
      payer_name: payload.payer_name,
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

    // Log the response for debugging
    console.log("Xendit API response received:", {
      id: responseData.id || "no-id",
      status: responseData.status || "unknown",
      invoice_url: responseData.invoice_url ? "URL received" : "No URL",
    })

    if (!response.ok) {
      console.error("Xendit API error:", responseData)
      throw new Error(`Payment processing failed: ${responseData.message || "Unknown error"}`)
    }

    // Return the invoice URL directly for redirection
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

