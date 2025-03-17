import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature, updatePaymentStatus } from "@/app/actions/payment-actions"

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
    
    // Handle different event types
    switch (event) {
      case "invoice.paid":
        // Payment was successful
        await updatePaymentStatus(data.id, "paid")
        break
        
      case "invoice.expired":
        // Payment expired
        await updatePaymentStatus(data.id, "expired")
        break
        
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