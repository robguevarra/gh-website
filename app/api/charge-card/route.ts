import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { token_id, amount, description } = await request.json()

    if (!token_id || !amount) {
      return NextResponse.json({ error: true, message: "Missing required parameters" }, { status: 400 })
    }

    // Create a charge using Xendit's API
    const response = await fetch("https://api.xendit.co/credit_card_charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        token_id,
        external_id: `charge-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        amount,
        description,
        currency: "PHP",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Xendit charge error:", errorData)
      return NextResponse.json(
        { error: true, message: errorData.message || "Payment processing failed" },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      id: data.id,
      status: data.status,
      amount: data.amount,
    })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json({ error: true, message: "An unexpected error occurred" }, { status: 500 })
  }
}

