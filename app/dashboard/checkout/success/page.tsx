import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { getTransactionByExternalId } from '@/app/actions/payment-actions'; // Action to fetch transaction details
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClearCartClient from './ClearCartClient'; // Client component to clear cart
import { formatPrice } from '@/lib/utils';

interface SuccessPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// Async component to fetch and display transaction details
async function TransactionDetails({ externalId }: { externalId: string }) {
  const transaction = await getTransactionByExternalId(externalId);

  if (!transaction) {
    return <p className="text-center text-orange-600">Could not retrieve transaction details, but payment may have succeeded.</p>;
  }

  return (
    <div className="text-sm text-muted-foreground space-y-1 mt-4">
      <p><strong>Order ID:</strong> {transaction.external_id}</p>
      <p><strong>Status:</strong> {transaction.status}</p>
      {transaction.amount && transaction.currency && (
          <p><strong>Amount Paid:</strong> {formatPrice(transaction.amount, transaction.currency)}</p>
      )}
      <p><strong>Date:</strong> {new Date(transaction.paid_at || transaction.created_at || Date.now()).toLocaleString()}</p>
       {/* Optionally display purchased items if stored in metadata and needed */}
    </div>
  );
}

// Main page component
export default function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const externalId = typeof searchParams.external_id === 'string' ? searchParams.external_id : null;

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-semibold">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Thank you for your purchase! Your order is confirmed.
            You should receive access to your digital products shortly.
          </p>
          
          {externalId ? (
            <Suspense fallback={<p className="text-center">Loading order details...</p>}>
              <TransactionDetails externalId={externalId} />
            </Suspense>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Order details are unavailable.</p>
          )}
          
          {/* Client component responsible for clearing the cart */}
          <ClearCartClient />
          
          <Button asChild className="w-full">
            <Link href="/dashboard/store">Continue Shopping</Link>
          </Button>
           <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 