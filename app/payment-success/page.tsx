"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle, ArrowLeft, Loader } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Separate component that uses useSearchParams to handle client-side navigation
function PaymentVerification() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<{
    id: string;
    status: string;
    amount?: number;
    email?: string;
  } | null>(null)

  useEffect(() => {
    // Get the payment ID from the URL
    const paymentId = searchParams.get("id")
    
    if (!paymentId) {
      // If no payment ID is provided, redirect to home
      router.push("/")
      return
    }
    
    // Verify the payment status with our API
    const verifyPayment = async () => {
      try {
        setIsVerifying(true)
        
        // Call our API to check payment status
        const response = await fetch(`/api/payments/status?id=${paymentId}`)
        const data = await response.json()
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to verify payment")
        }
        
        // Set payment details from the API response
        setPaymentDetails({
          id: data.data.id,
          status: data.data.status.toLowerCase(),
          amount: data.data.amount,
          email: data.data.customer_email,
        })
      } catch (error) {
        console.error("Failed to verify payment:", error)
        // If verification fails, redirect to failure page
        router.push(`/payment-failure?id=${paymentId}&error=verification_failed`)
      } finally {
        setIsVerifying(false)
      }
    }
    
    verifyPayment()
  }, [router, searchParams])

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Loader className="h-12 w-12 animate-spin text-[#ad8174] mx-auto mb-4" />
          <h2 className="text-xl font-serif text-[#5d4037]">Verifying your payment...</h2>
          <p className="text-[#6d4c41] mt-2">Please wait while we confirm your payment.</p>
        </div>
      </div>
    )
  }

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
            className="w-20 h-20 rounded-full bg-[#f0e6dd] flex items-center justify-center mx-auto"
          >
            <CheckCircle className="h-10 w-10 text-[#ad8174]" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl font-serif text-[#5d4037]">Payment Successful!</h1>
            <p className="text-[#6d4c41]">
              Thank you for enrolling in Papers to Profits. Your payment has been processed successfully.
            </p>
          </div>

          {paymentDetails && (
            <div className="bg-[#f0e6dd] rounded-lg p-4 text-sm text-[#6d4c41]">
              <p className="font-medium mb-2">Payment Details:</p>
              <p>Order ID: {paymentDetails.id}</p>
              {paymentDetails.amount && (
                <p>Amount: ${(paymentDetails.amount / 100).toFixed(2)}</p>
              )}
              <p className="mt-2">A confirmation email has been sent to your email address with all the details.</p>
            </div>
          )}

          <div className="pt-4">
            <Link href="/">
              <Button className="bg-[#ad8174] hover:bg-[#8d6e63] text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>
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
        <Loader className="h-12 w-12 animate-spin text-[#ad8174] mx-auto mb-4" />
        <h2 className="text-xl font-serif text-[#5d4037]">Loading payment information...</h2>
        <p className="text-[#6d4c41] mt-2">Please wait a moment.</p>
      </div>
    </div>
  )
}

// Main page component that uses Suspense boundary
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentVerification />
    </Suspense>
  )
}

