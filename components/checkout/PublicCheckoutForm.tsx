'use client';

import React, { useState, useTransition } from 'react';
import { usePublicCartStore, selectPublicCartItems, selectPublicCartTotalPrice } from '@/stores/publicCartStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from '@/lib/utils';
import { createPublicXenditPayment } from '@/app/actions/publicCheckoutActions';
import { AlertCircle, Loader2, ChevronLeft, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/components/ui/use-toast';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from 'next/link';

export default function PublicCheckoutForm() {
    const items = usePublicCartStore(selectPublicCartItems);
    const totalPrice = usePublicCartStore(selectPublicCartTotalPrice);
    const removeItem = usePublicCartStore((state) => state.removeItem);

    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [marketingOptIn, setMarketingOptIn] = useState(true);

    // totalPrice is already a number from selector
    // const totalPrice = getTotalPrice(); // REMOVED

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleEmailBlur = async () => {
        if (email && validateEmail(email)) {
            try {
                // Capture lead early (abandoned cart)
                await fetch('/api/leads/capture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        firstName: email.split('@')[0], // Best guess for guest
                        lastName: '',
                        productType: 'PublicShop',
                        sourcePage: '/shop/checkout',
                        marketingOptIn: marketingOptIn,
                        metadata: { event: 'email_blur' }
                    })
                });
            } catch (e) {
                console.error("[Tracking] Email blur capture failed", e);
            }
        }
    };

    const handlePayment = async () => {
        setError(null);
        setEmailError(null);

        // Validate Email
        if (!email) {
            setEmailError('Email address is required.');
            return;
        }
        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }

        startTransition(async () => {
            try {
                const result = await createPublicXenditPayment(items, email, marketingOptIn);

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
        return (
            <div className="text-center py-10">
                <p className="mb-4">Your cart is empty.</p>
                <Button asChild>
                    <Link href="/shop">Go Shopping</Link>
                </Button>
            </div>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto shadow-md">
            <CardHeader className="relative pb-2">
                <Link href="/shop" className="absolute left-0 top-0 mt-3 ml-3 sm:mt-4 sm:ml-4 text-sm text-muted-foreground hover:text-foreground inline-flex items-center">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Store
                </Link>
                <CardTitle className="text-center pt-6 sm:pt-4 text-2xl">Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Email Input Section */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold text-base">Contact Information</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) setEmailError(null);
                        }}
                        className={emailError ? 'border-red-500' : ''}
                        disabled={isPending}
                        onBlur={handleEmailBlur}
                    />
                    {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                    <p className="text-xs text-muted-foreground">
                        We'll send your order confirmation and digital downloads to this email.
                    </p>

                    <div className="flex items-start space-x-2 pt-2">
                        <Checkbox
                            id="marketing-opt-in"
                            checked={marketingOptIn}
                            onCheckedChange={(checked) => setMarketingOptIn(checked as boolean)}
                            className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="marketing-opt-in"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                            >
                                Email me guidance, reminders, occasional offers and discounts related to this purchase
                            </label>
                            <p className="text-xs text-muted-foreground">
                                You can unsubscribe anytime. We don’t spam.
                            </p>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Order Summary */}
                <div>
                    <h3 className="font-semibold text-base mb-3">Order Summary</h3>
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.productId} className="flex justify-between items-start">
                                <div className="flex-grow pr-4">
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Qty: {item.quantity}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-neutral-400 hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                            removeItem(item.productId);
                                            toast({
                                                title: "Item Removed",
                                                description: `${item.title} has been removed from your cart.`,
                                            });
                                        }}
                                        aria-label={`Remove ${item.title} from cart`}
                                        disabled={isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center font-bold text-lg pt-2">
                    <p>Total</p>
                    <p className="text-xl">{formatPrice(totalPrice)}</p>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-4 pb-8 pt-2">
                <Button
                    onClick={handlePayment}
                    className="w-full text-lg h-12"
                    size="lg"
                    disabled={isPending}
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        `Pay ${formatPrice(totalPrice)}`
                    )}
                </Button>
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Secure</span>
                    Encrypted payment via Xendit
                </p>
            </CardFooter>
        </Card>
    );
}
