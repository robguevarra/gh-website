
import React from 'react';
import PublicCheckoutForm from '@/components/checkout/PublicCheckoutForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Checkout | Graceful Homeschooling',
    description: 'Complete your purchase.',
};

export default function CheckoutPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-center">Secure Checkout</h1>
            <PublicCheckoutForm />
        </div>
    );
}
