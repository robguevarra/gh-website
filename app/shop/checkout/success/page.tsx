'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { usePublicCartStore } from '@/stores/publicCartStore';

export default function CheckoutSuccessPage() {
    const clearCart = usePublicCartStore((state) => state.clearCart);

    useEffect(() => {
        clearCart();
    }, [clearCart]);

    return (
        <div className="container mx-auto px-4 py-20 max-w-lg text-center">
            <div className="flex justify-center mb-6">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Order Placed!</h1>
            <p className="text-muted-foreground mb-8">
                Thank you for your purchase. We have sent an email confirmation with your digital downloads (if applicable) and order details.
            </p>
            <div className="flex flex-col gap-3">
                <Button asChild size="lg">
                    <Link href="/shop">Continue Shopping</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/">Back to Home</Link>
                </Button>
            </div>
        </div>
    );
}
