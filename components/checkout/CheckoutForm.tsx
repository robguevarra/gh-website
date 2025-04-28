'use client';

import React, { useState, useTransition } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from '@/lib/utils';
import { createXenditEcommercePayment } from '@/app/actions/checkoutActions';
import { AlertCircle, Loader2, ChevronLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';

export default function CheckoutForm() {
  const items = useCartStore((state) => state.items);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPrice = getTotalPrice();

  const handlePayment = async () => {
    setError(null);

    startTransition(async () => {
      try {
        const result = await createXenditEcommercePayment(items);

        if (result.success && result.invoiceUrl) {
          window.location.href = result.invoiceUrl;
        } else {
          console.error('Payment initiation failed:', result.error);
          setError(result.error || 'Failed to initiate payment. Please try again.');
        }
      } catch (err: any) {
        console.error('Error calling payment action:', err);
        setError(err.message || 'An unexpected error occurred during checkout.');
      }
    });
  };

  if (items.length === 0) {
    return <p>Your cart is empty. Please add items to your cart before checking out.</p>;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="relative">
        <Link href="/dashboard/store" className="absolute left-0 top-0 mt-3 ml-3 sm:mt-4 sm:ml-4 text-sm text-muted-foreground hover:text-foreground inline-flex items-center">
           <ChevronLeft className="h-4 w-4 mr-1" />
           Back to Store
        </Link>
        <CardTitle className="text-center pt-2 sm:pt-0">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {items.map((item) => (
          <div key={item.productId} className="flex justify-between items-center">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                Quantity: {item.quantity}
              </p>
            </div>
            <p>{formatPrice(item.price * item.quantity)}</p>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between font-semibold text-lg">
          <p>Total</p>
          <p>{formatPrice(totalPrice)}</p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <Button 
          onClick={handlePayment} 
          className="w-full" 
          size="lg" 
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Proceed to Payment'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 