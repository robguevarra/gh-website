import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { getTransactionByExternalId } from '@/app/actions/payment-actions'; // Action to fetch transaction details
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClearCartClient from './ClearCartClient'; // Client component to clear cart
import { formatPrice } from '@/lib/utils';

interface SuccessPageProps {
  // searchParams is inherently asynchronous in Next.js 15+
  searchParams: { [key: string]: string | string[] | undefined }; 
}

// Change prop type back to externalId
interface TransactionDetailsProps {
  externalId: string | null; 
}

// Async component accepts externalId prop
async function TransactionDetails({ externalId }: TransactionDetailsProps) { 

  if (!externalId) {
    return <p className="text-center text-orange-600">Order ID not found in URL.</p>;
  }

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
      
      {/* Display purchased items and links */}
      {transaction.ecommerce_orders && transaction.ecommerce_orders.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold mb-2 text-gray-700">Purchased Items:</h4>
          <ul className="space-y-2">
            {transaction.ecommerce_orders[0].ecommerce_order_items.map((item) => (
              <li key={item.id} className="flex justify-between items-center">
                <span>
                  {item.shopify_products?.title || 'Unknown Product'}
                  {item.quantity > 1 && ` (x${item.quantity})`}
                </span>
                {item.shopify_products?.google_drive_file_id ? (
                  <Button variant="link" size="sm" asChild className="h-auto p-0 text-blue-600 hover:text-blue-800">
                    <a 
                      href={`https://drive.google.com/drive/folders/${item.shopify_products.google_drive_file_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Access Content
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400 italic">No link</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Main page component remains ASYNC
export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  // Await the searchParams object before accessing its properties
  const resolvedSearchParams = await searchParams;
  
  // Now safely access the property from the resolved object
  const externalId = typeof resolvedSearchParams.external_id === 'string' ? resolvedSearchParams.external_id : null;

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
          
          {/* Use the safely extracted externalId */}
          {externalId ? (
            <Suspense fallback={<p className="text-center">Loading order details...</p>}>
              {/* Pass the externalId string prop */}
              <TransactionDetails externalId={externalId} /> 
            </Suspense>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Order details are unavailable (No ID found).</p>
          )}
          
          {/* Client component responsible for clearing the cart */}
          <ClearCartClient />
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/dashboard/purchase-history">View Purchase History</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard/store">Continue Shopping</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full text-muted-foreground">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 