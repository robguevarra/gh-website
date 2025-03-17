"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { CreditCard, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"

// Add TypeScript declaration for Xendit
declare global {
  interface Window {
    Xendit?: {
      setPublishableKey: (key: string) => void;
      card: {
        createToken: (data: any, callback: (err: any, response: any) => void) => void;
      };
    }
  }
}

// Add TypeScript interfaces for Xendit responses
interface XenditError {
  error_code: string;
  message: string;
}

interface XenditCreditCardToken {
  status: "VERIFIED" | "APPROVED" | "FAILED" | "IN_REVIEW";
  id: string;
  authentication_id?: string;
  masked_card_number: string;
  card_info?: {
    bank: string;
    country: string;
    type: string;
    brand: string;
  };
}

interface XenditPaymentProps {
  amount: number
  onSuccess: (paymentId: string) => void
  onError: (error: string) => void
}

export function XenditPayment({ amount, onSuccess, onError }: XenditPaymentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardHolderName, setCardHolderName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [xenditLoaded, setXenditLoaded] = useState(false)

  // Load Xendit.js script
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://js.xendit.co/v1/xendit.min.js"
    script.async = true
    script.onload = () => {
      if (window.Xendit) {
        // Initialize Xendit with your publishable key
        window.Xendit.setPublishableKey("xnd_public_development_your_key_here")
        setXenditLoaded(true)
      }
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  // Format card expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")

    if (v.length >= 3) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }

    return value
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) {
      newErrors.cardNumber = "Valid card number is required"
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      newErrors.cardExpiry = "Valid expiry date is required"
    }
    if (!cardCvc || cardCvc.length < 3) {
      newErrors.cardCvc = "Valid CVC is required"
    }
    if (!cardHolderName) {
      newErrors.cardHolderName = "Cardholder name is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !xenditLoaded || !window.Xendit) {
      return
    }

    setIsLoading(true)

    try {
      // Extract month and year from expiry date
      const [month, year] = cardExpiry.split("/")

      // Create a token with Xendit
      window.Xendit.card.createToken(
        {
          amount: amount,
          card_number: cardNumber.replace(/\s/g, ""),
          card_exp_month: month,
          card_exp_year: `20${year}`,
          card_cvn: cardCvc,
          is_multiple_use: false,
        },
        xenditResponseHandler,
      )
    } catch (error) {
      setIsLoading(false)
      onError("An error occurred while processing your payment. Please try again.")
    }
  }

  const xenditResponseHandler = (err: XenditError | null, creditCardToken: XenditCreditCardToken) => {
    setIsLoading(false)

    if (err) {
      // Handle Xendit errors
      const errorMessage = err.message || "An error occurred while processing your payment"
      setErrors({ payment: errorMessage })
      onError(errorMessage)
      return
    }

    if (creditCardToken.status === "VERIFIED" || creditCardToken.status === "APPROVED") {
      // Token was created successfully, now charge the card on your server
      processPaymentOnServer(creditCardToken.id)
    } else {
      // Token creation failed
      setErrors({ payment: "Card verification failed. Please try again." })
      onError("Card verification failed. Please try again.")
    }
  }

  const processPaymentOnServer = async (tokenId: string) => {
    setIsLoading(true)

    try {
      // Call your server action to charge the card using the token
      const response = await fetch("/api/charge-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_id: tokenId,
          amount: amount,
          description: "Papers to Profits Course Enrollment",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Payment processing failed")
      }

      // Payment successful
      onSuccess(data.id)
    } catch (error) {
      setErrors({
        payment:
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : "Payment processing failed. Please try again.",
      })
      onError("Payment processing failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-[#5d4037] mb-2">Payment Details</h3>
        <p className="text-[#6d4c41] text-sm">Your payment is securely processed by Xendit</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardHolderName" className="text-[#5d4037]">
            Cardholder Name
          </Label>
          <Input
            id="cardHolderName"
            value={cardHolderName}
            onChange={(e) => setCardHolderName(e.target.value)}
            className={`bg-white ${errors.cardHolderName ? "border-red-500" : ""}`}
            placeholder="Name on card"
          />
          {errors.cardHolderName && <p className="text-red-500 text-xs mt-1">{errors.cardHolderName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardNumber" className="text-[#5d4037]">
            Card Number
          </Label>
          <div className="relative">
            <Input
              id="cardNumber"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className={`bg-white pl-10 ${errors.cardNumber ? "border-red-500" : ""}`}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
            />
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cardExpiry" className="text-[#5d4037]">
              Expiry Date
            </Label>
            <Input
              id="cardExpiry"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(formatExpiryDate(e.target.value))}
              className={`bg-white ${errors.cardExpiry ? "border-red-500" : ""}`}
              placeholder="MM/YY"
              maxLength={5}
            />
            {errors.cardExpiry && <p className="text-red-500 text-xs mt-1">{errors.cardExpiry}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardCvc" className="text-[#5d4037]">
              CVC
            </Label>
            <Input
              id="cardCvc"
              value={cardCvc}
              onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, "").substring(0, 3))}
              className={`bg-white ${errors.cardCvc ? "border-red-500" : ""}`}
              placeholder="123"
              maxLength={3}
            />
            {errors.cardCvc && <p className="text-red-500 text-xs mt-1">{errors.cardCvc}</p>}
          </div>
        </div>

        {errors.payment && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <p>{errors.payment}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-brand-purple hover:bg-[#8d6e63] text-white py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          disabled={isLoading || !xenditLoaded}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            <>Pay ₱{(amount / 100).toFixed(2)}</>
          )}
        </Button>

        <div className="flex items-center justify-center mt-4">
          <Image 
            src="/placeholder.svg?height=24&width=60&text=Visa" 
            alt="Visa" 
            width={60}
            height={24}
            className="h-6 mx-1" 
          />
          <Image 
            src="/placeholder.svg?height=24&width=60&text=Mastercard" 
            alt="Mastercard" 
            width={60}
            height={24}
            className="h-6 mx-1" 
          />
          <Image 
            src="/placeholder.svg?height=24&width=60&text=Amex" 
            alt="American Express" 
            width={60}
            height={24}
            className="h-6 mx-1" 
          />
        </div>
      </form>
    </div>
  )
}

