
import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function CheckoutFailurePage() {
    return (
        <div className="container mx-auto px-4 py-20 max-w-lg text-center">
            <div className="flex justify-center mb-6">
                <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Payment Failed</h1>
            <p className="text-muted-foreground mb-8">
                We encountered an issue processing your payment. No charges were made. Please try again or contact support if the issue persists.
            </p>
            <div className="flex flex-col gap-3">
                <Button asChild size="lg">
                    <Link href="/shop/checkout">Try Again</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/shop">Back to Store</Link>
                </Button>
            </div>
        </div>
    );
}
