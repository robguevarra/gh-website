import { XCircle, RefreshCw, ArrowLeft, Triangle, Loader } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"

// Define error messages for different error types
const ERROR_MESSAGES: { [key: string]: string } = {
  failed: "Your payment could not be processed. Please try again or use a different payment method.",
  expired: "Your payment session has expired. Please try again.",
  cancelled: "You cancelled the payment process. You can try again whenever you're ready.",
  verification_failed: "We couldn't verify your payment status. Please contact our support team.",
  status_pending: "Your payment status is still pending. Please wait a few moments or contact support.",
  default: "We're sorry, but there was an issue with your payment. Please try again or contact our support team.",
}

// Define props for the page
interface PaymentFailurePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// Loading component
function LoadingState() {
  return (
    <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <Loader className="h-12 w-12 animate-spin text-[#ad8174] mx-auto mb-4" />
        <h2 className="text-xl font-serif text-[#5d4037]">Processing Payment Status...</h2>
        <p className="text-[#6d4c41] mt-2">Please wait a moment.</p>
      </div>
    </div>
  );
}

// Server component that handles data fetching
async function PaymentFailureContent({ searchParams }: PaymentFailurePageProps) {
  // Access searchParams directly - it's not a Promise in Server Components
  const paymentId = typeof searchParams.id === 'string' ? searchParams.id : undefined;
  const errorType = typeof searchParams.error === 'string' ? searchParams.error : "default";

  // Log the failure reason (can be enhanced)
  console.log(`Payment failure page loaded: Error type = ${errorType}, ID = ${paymentId}`);

  // Get the appropriate error message
  const errorMessage = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.default;

  return (
    <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            {errorType === "expired" || errorType === "status_pending" ? (
              <Triangle className="h-10 w-10 text-amber-500" />
            ) : (
              <XCircle className="h-10 w-10 text-red-500" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-serif text-[#5d4037]">Payment Issue</h1>
            <p className="text-[#6d4c41]">{errorMessage}</p>
          </div>

          <div className="bg-red-50 rounded-lg p-4 text-sm text-red-600">
            {errorType !== 'status_pending' && (
              <p>No charges were made to your payment method.</p>
            )}
            {paymentId && <p className="mt-1">Reference ID: {paymentId}</p>}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            {errorType !== 'cancelled' && (
              <Link href="/p2p-order-form"> 
                <Button className="bg-[#ad8174] hover:bg-[#8d6e63] text-white">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </Link>
            )}
            <Link href="/">
              <Button variant="outline" className="border-[#ad8174] text-[#ad8174]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>
          
          <p className="text-xs text-[#6d4c41] mt-6">
            Need help? Contact our support team at{" "}
            <a href="mailto:help@gracefulhomeschooling.com" className="text-brand-purple underline">
              help@gracefulhomeschooling.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Main page component that wraps the content in a Suspense boundary
export default function PaymentFailurePage(props: PaymentFailurePageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      {/* @ts-ignore - This is a valid pattern in Next.js for async server components inside client boundaries */}
      <PaymentFailureContent searchParams={props.searchParams} />
    </Suspense>
  );
}

