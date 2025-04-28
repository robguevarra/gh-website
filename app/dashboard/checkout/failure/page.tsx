import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FailurePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function CheckoutFailurePage({ searchParams }: FailurePageProps) {
  // You could potentially use searchParams.error or searchParams.external_id 
  // to display more specific error information if needed.
  const errorMessage = typeof searchParams.error === 'string' 
    ? decodeURIComponent(searchParams.error) 
    : "Your payment could not be processed.";
  const externalId = typeof searchParams.external_id === 'string' ? searchParams.external_id : null;

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <Card className="w-full max-w-lg text-center border-destructive">
        <CardHeader>
          <div className="mx-auto bg-red-100 rounded-full p-3 w-fit">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-semibold">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            {errorMessage}
          </p>
          {externalId && (
            <p className="text-sm text-muted-foreground">
              Order Reference: {externalId}
            </p>
          )}
          <p className="text-muted-foreground">
            Please check your payment details and try again, or contact support if the problem persists.
          </p>
          
          <Button asChild className="w-full">
            {/* Link back to checkout page to retry */}
            <Link href="/dashboard/checkout">Try Again</Link> 
          </Button>
           <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard/store">Back to Store</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 