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
    // Get the request body
    const body = await request.json()
    
    // Get the Xendit signature from headers
    const signature = request.headers.get("x-callback-token") || ""
    
    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(body, signature)
    
    if (!isValid) {
      console.error("Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    
    // Process the webhook based on the event type
    const { event, data } = body
    
    console.log(`Received Xendit webhook: ${event}`, {
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
          console.error("Error fetching transaction:", txError)
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
          } catch (err) {
            console.error("Failed to log transaction from webhook:", err)
          }
        }
        // 3. If still no transaction, abort
        if (!tx) {
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
            } catch (err) {
              console.error("Failed to ensure user/profile:", err)
            }
          }
          // Create enrollment
          if (userId) {
            try {
              await createEnrollment({
                userId,
                transactionId: tx.id,
                courseId: tx.metadata?.course_id || "default-course-id",
              })
            } catch (err) {
              console.error("Failed to create enrollment:", err)
            }
          }
          // If this user previously bought an ebook, upgrade their transactions
          try {
            await upgradeEbookBuyerToCourse({
              email: tx.contact_email || tx.email,
              name: tx.metadata?.name || "Course Buyer",
            })
          } catch (err) {
            console.error("Failed to upgrade ebook buyer to course:", err)
          }
        } else if (tx.product_type === "ebook") {
          // Store ebook contact info
          try {
            await storeEbookContactInfo({
              email: tx.contact_email || tx.email,
              metadata: tx.metadata || {},
            })
          } catch (err) {
            console.error("Failed to store ebook contact info:", err)
          }
        }
        // Always update payment status
        await updatePaymentStatus(data.external_id, "paid")
        break
      }
      case "invoice.expired": {
        // Payment expired
        await updatePaymentStatus(data.external_id, "expired")
        break
      }
      default:
        // Log unknown events
        console.log(`Unhandled Xendit webhook event: ${event}`)
    }
    
    // Return a success response
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Xendit webhook:", error)
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