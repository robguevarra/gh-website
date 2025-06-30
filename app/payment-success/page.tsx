import { Loader } from "lucide-react"
import { getTransactionByExternalId, TransactionDetails } from "@/app/actions/payment-actions"
import { Suspense } from "react"
import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"

// Import client components
import { SuccessContent } from "./success-content"
import { ErrorContent } from "./error-content"

// Define props for the page (in Next.js 15, searchParams is a Promise)
interface PaymentSuccessPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Loading component (can be reused)
function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 bg-[#f8f5f1] flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-md">
          <Loader className="h-8 w-8 animate-spin text-[#ad8174] mx-auto" />
          <p className="mt-4 text-[#6d4c41] font-medium">Loading your purchase details...</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

// The server component that handles data fetching
async function PaymentSuccessContent({ searchParams }: PaymentSuccessPageProps) {
  // In Next.js 15, searchParams is a Promise and needs to be awaited
  const resolvedSearchParams = await searchParams;
  const externalId = typeof resolvedSearchParams.id === 'string' ? resolvedSearchParams.id : undefined;
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
    return <ErrorContent errorMessage={errorMessage} />;
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

  // Pass all the relevant data to the client component
  return (
    <SuccessContent 
      firstName={firstName}
      confirmationLine1={confirmationLine1}
      confirmationLine2={confirmationLine2}
      productName={productName}
      externalId={transaction?.external_id}
      amountPaid={amountPaid}
      formattedAmount={formattedAmount}
      productType={productType}
    />
  );
}

// Main page component that wraps the content in a Suspense boundary
export default function PaymentSuccessPage(props: PaymentSuccessPageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      {/* @ts-ignore - This is a valid pattern in Next.js for async server components inside client boundaries */}
      <PaymentSuccessContent searchParams={props.searchParams} />
    </Suspense>
  );
}

