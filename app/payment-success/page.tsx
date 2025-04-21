import { CheckCircle, ArrowLeft, Loader, XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getTransactionByExternalId, TransactionDetails } from "@/app/actions/payment-actions"
import { Suspense } from "react" // Keep Suspense for potential future client needs

// Define props for the page
interface PaymentSuccessPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// Loading component (can be reused)
function LoadingState() {
  return (
    <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <Loader className="h-12 w-12 animate-spin text-[#ad8174] mx-auto mb-4" />
        <h2 className="text-xl font-serif text-[#5d4037]">Loading Payment Confirmation...</h2>
        <p className="text-[#6d4c41] mt-2">Please wait a moment.</p>
      </div>
    </div>
  );
}

// Main page component - now an async Server Component
export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  // Await searchParams before accessing properties
  const awaitedSearchParams = await searchParams;
  const externalId = typeof awaitedSearchParams.id === 'string' ? awaitedSearchParams.id : undefined;
  let transaction: TransactionDetails | null = null;
  let errorMessage: string | null = null;

  if (!externalId) {
    errorMessage = "Payment reference ID is missing.";
  } else {
    transaction = await getTransactionByExternalId(externalId);
    if (!transaction) {
      errorMessage = `Could not retrieve transaction details for ID: ${externalId}. Please contact support.`;
    } else if (transaction.status !== 'paid' && transaction.status !== 'completed') {
      // Even if redirected here, if our backend hasn't confirmed via webhook, show pending/error
      errorMessage = `Payment status is currently ${transaction.status}. Please wait a few moments or contact support if this persists.`;
      // Optionally redirect to failure page: redirect(`/payment-failure?id=${externalId}&error=status_pending`);
    }
  }

  // Handle errors or missing transaction
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-serif text-[#5d4037]">Confirmation Error</h1>
          <p className="text-[#6d4c41] mt-2">{errorMessage}</p>
          <div className="pt-6">
            <Link href="/">
              <Button className="bg-[#ad8174] hover:bg-[#8d6e63] text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Successful state - transaction details are available
  const firstName = transaction?.metadata?.firstName || 'Valued Customer';
  const amountPaid = transaction?.amount; // Already in base units (cents for PHP)
  const currency = transaction?.currency || 'PHP'; // Default currency
  const productType = transaction?.metadata?.product_type as string | undefined; // e.g., 'ebook', 'course'
  const productId = transaction?.metadata?.product_id as string | undefined; // e.g., 'canva-ebook-01', 'p2p-course'

  // --- Determine Product Specific Details ---
  let productName = "Your Purchase";
  let confirmationLine1 = `Thank you, ${firstName}, for your purchase!`;
  let confirmationLine2 = "You should receive a confirmation email shortly with access details.";

  // TODO: Refactor product details into a separate config/helper if more products are added
  if (productId === "canva-ebook-01") {
    productName = "My Canva Business Ebook";
    confirmationLine1 = `Thank you, ${firstName}, for purchasing the ${productName}!`;
    confirmationLine2 = "You should receive an email shortly with the download link for your ebook.";
  } else if (productId === "p2p-course-01" || productType === 'course') { // Assuming 'p2p-course-01' is the ID for Papers to Profits
    productName = "Papers to Profits Course";
    confirmationLine1 = `Thank you, ${firstName}, for enrolling in ${productName}!`;
    confirmationLine2 = "Your enrollment is confirmed. You should receive a confirmation email shortly with details on how to access the course materials.";
  }
  // Add more else if blocks for other products

  // Format amount correctly (assuming amountPaid is the primary unit for PHP)
  const formattedAmount = amountPaid !== null && amountPaid !== undefined 
     ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amountPaid)
     : 'N/A';

  return (
    <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
      {/* Motion can be added back with a Client Component wrapper if desired */}
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#f0e6dd] flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-[#ad8174]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-serif text-[#5d4037]">Payment Successful!</h1>
            <p className="text-[#6d4c41]">
              {/* Dynamic confirmation line 1 */}
              {confirmationLine1}
            </p>
          </div>

          <div className="bg-[#f0e6dd] rounded-lg p-4 text-sm text-[#6d4c41]">
            <p className="font-medium mb-2">Confirmation Details:</p>
            <p>Product: {productName}</p> {/* Added Product Name */}
            <p>Order Reference: {transaction?.external_id || 'N/A'}</p>
            {amountPaid !== null && amountPaid !== undefined && (
              <p>Amount Paid: {formattedAmount}</p> // Use formatted amount
            )}
            <p className="mt-2">
              {/* Dynamic confirmation line 2 */}
              {confirmationLine2}
            </p>
          </div>

          <div className="pt-4">
            {/* TODO: Add relevant links, e.g., to a student dashboard or course page */}
            <Link href="/"> 
              <Button className="bg-[#ad8174] hover:bg-[#8d6e63] text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Removed client-side components (PaymentVerification) and Suspense wrapper for now
// as the main logic is handled server-side.

