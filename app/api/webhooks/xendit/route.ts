import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature, updatePaymentStatus } from "@/app/actions/payment-actions"
import {
  ensureAuthUserAndProfile,
  logTransaction,
  createEnrollment,
  storeEbookContactInfo,
  upgradeEbookBuyerToCourse,
} from "@/app/actions/payment-utils"
import { getAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    // Log incoming request
    console.log("[Webhook] Incoming request headers:", Object.fromEntries(request.headers.entries()))
    const body = await request.json()
    console.log("[Webhook] Incoming request body:", JSON.stringify(body, null, 2))
    // Get the Xendit signature from headers
    const signature = request.headers.get("x-callback-token") || ""
    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(body, signature)
    console.log(`[Webhook] Signature valid:`, isValid)
    if (!isValid) {
      console.error("[Webhook] Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    // Process the webhook based on the event type
    const { event, data } = body
    console.log(`[Webhook] Received Xendit webhook: ${event}`, {
      id: data?.id,
      status: data?.status,
      external_id: data?.external_id,
    })
    // Get Supabase admin client
    const supabase = getAdminClient()
    // Handle different event types
    switch (event) {
      case "invoice.paid": {
        // 1. Fetch the transaction by external_id
        const { data: transaction, error: txError } = await supabase
          .from("transactions")
          .select("*")
          .eq("external_id", data.external_id)
          .maybeSingle()
        let tx = transaction
        if (txError) {
          console.error("[Webhook] Error fetching transaction:", txError)
        } else {
          console.log("[Webhook] Transaction fetched:", tx)
        }
        // 2. If not found, log it
        if (!tx) {
          // Fallback: try to log transaction with minimal info
          try {
            tx = await logTransaction({
              productType: data.metadata?.product_type || "course",
              userId: null,
              email: data.payer_email || data.customer?.email || "",
              amount: data.amount || 0,
              metadata: data.metadata || {},
            })
            console.log("[Webhook] Transaction logged via logTransaction:", tx)
          } catch (err) {
            console.error("[Webhook] Failed to log transaction from webhook:", err)
          }
        }
        // 3. If still no transaction, abort
        if (!tx) {
          console.error("[Webhook] Transaction not found or could not be logged. Aborting.")
          return NextResponse.json({ error: "Transaction not found or could not be logged" }, { status: 400 })
        }
        // 4. Handle by product type
        if (tx.product_type === "course") {
          // Ensure user/profile
          let userId = tx.user_id
          if (!userId) {
            try {
              const { userId: ensuredUserId } = await ensureAuthUserAndProfile({
                email: tx.contact_email || tx.metadata?.contact_email || tx.email,
                name: tx.metadata?.name || "Course Buyer",
              })
              userId = ensuredUserId
              // Optionally update transaction with userId
              await supabase.from("transactions").update({ user_id: userId }).eq("id", tx.id)
              console.log("[Webhook] User/profile ensured and transaction updated with userId:", userId)
            } catch (err) {
              console.error("[Webhook] Failed to ensure user/profile:", err)
            }
          } else {
            console.log("[Webhook] User already present on transaction:", userId)
          }
          // Create enrollment
          if (userId) {
            try {
              const enrollment = await createEnrollment({
                userId,
                transactionId: tx.id,
                courseId: tx.metadata?.course_id || "default-course-id",
              })
              console.log("[Webhook] Enrollment created:", enrollment)
            } catch (err) {
              console.error("[Webhook] Failed to create enrollment:", err)
            }
          }
          // If this user previously bought an ebook, upgrade their transactions
          try {
            const upgradeResult = await upgradeEbookBuyerToCourse({
              email: tx.contact_email || tx.email,
              name: tx.metadata?.name || "Course Buyer",
            })
            console.log("[Webhook] Upgrade ebook buyer to course result:", upgradeResult)
          } catch (err) {
            console.error("[Webhook] Failed to upgrade ebook buyer to course:", err)
          }
        } else if (tx.product_type === "ebook") {
          // Store ebook contact info
          try {
            const contact = await storeEbookContactInfo({
              email: tx.contact_email || tx.email,
              metadata: tx.metadata || {},
            })
            console.log("[Webhook] Ebook contact info stored:", contact)
          } catch (err) {
            console.error("[Webhook] Failed to store ebook contact info:", err)
          }
        }
        // Always update payment status
        try {
          await updatePaymentStatus(data.external_id, "paid")
          console.log("[Webhook] Payment status updated to 'paid' for:", data.external_id)
        } catch (err) {
          console.error("[Webhook] Failed to update payment status:", err)
        }
        break
      }
      case "invoice.expired": {
        // Payment expired
        try {
          await updatePaymentStatus(data.external_id, "expired")
          console.log("[Webhook] Payment status updated to 'expired' for:", data.external_id)
        } catch (err) {
          console.error("[Webhook] Failed to update payment status:", err)
        }
        break
      }
      default:
        // Log unknown events
        console.log(`[Webhook] Unhandled Xendit webhook event: ${event}`)
    }
    // Return a success response
    console.log("[Webhook] Handler completed successfully.")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Webhook] Error processing Xendit webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Disable body parsing for raw body access if needed
export const config = {
  api: {
    bodyParser: false,
  },
} 