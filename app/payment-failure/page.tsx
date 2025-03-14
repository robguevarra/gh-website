"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { XCircle, RefreshCw, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Define error messages for different error types
const ERROR_MESSAGES = {
  failed: "Your payment could not be processed. Please try again or use a different payment method.",
  expired: "Your payment session has expired. Please try again.",
  cancelled: "You cancelled the payment process. You can try again whenever you're ready.",
  verification_failed: "We couldn't verify your payment status. Please contact our support team.",
  default: "We're sorry, but there was an issue with your payment. Please try again or contact our support team.",
}

// Separate component that uses useSearchParams
function PaymentFailureContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorType, setErrorType] = useState<string>("default")
  const [paymentId, setPaymentId] = useState<string | null>(null)

  useEffect(() => {
    // Get the payment ID and error type from the URL
    const id = searchParams.get("id")
    const error = searchParams.get("error") || "default"
    
    setPaymentId(id)
    setErrorType(error)
    
    // You could log the failure reason here for analytics
    console.log(`Payment failure: ${error}, ID: ${id}`)
  }, [searchParams])

  // Get the appropriate error message
  const errorMessage = ERROR_MESSAGES[errorType as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.default

  return (
    <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-xl shadow-lg p-8"
      >
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto"
          >
            {errorType === "expired" ? (
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            ) : (
              <XCircle className="h-10 w-10 text-red-500" />
            )}
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl font-serif text-[#5d4037]">Payment Failed</h1>
            <p className="text-[#6d4c41]">{errorMessage}</p>
          </div>

          <div className="bg-red-50 rounded-lg p-4 text-sm text-red-600">
            <p>No charges were made to your payment method.</p>
            {paymentId && <p className="mt-1">Reference ID: {paymentId}</p>}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/papers-to-profits">
              <Button className="bg-[#ad8174] hover:bg-[#8d6e63] text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="border-[#ad8174] text-[#ad8174]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>
          
          <p className="text-xs text-[#6d4c41] mt-6">
            Need help? Contact our support team at{" "}
            <a href="mailto:support@gracefulhomeschooling.com" className="text-brand-purple underline">
              support@gracefulhomeschooling.com
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#ad8174] mx-auto mb-4" />
        <h2 className="text-xl font-serif text-[#5d4037]">Loading payment information...</h2>
        <p className="text-[#6d4c41] mt-2">Please wait a moment.</p>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentFailureContent />
    </Suspense>
  )
}

