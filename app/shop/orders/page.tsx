'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Search, ArrowRight } from 'lucide-react';
import { getGuestOrders } from '@/app/actions/guest-access';
import { GuestOrderCard } from '@/components/shop/GuestOrderCard';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface OrderSummary {
    id: string;
    date: string;
    total: number;
    status: string;
    maskedNumber: string;
}

export default function GuestOrderSearchPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const { toast } = useToast();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        setHasSearched(false);

        try {
            const results = await getGuestOrders(email);
            setOrders(results);
            setHasSearched(true);

            if (results.length === 0) {
                toast({
                    title: 'No Orders Found',
                    description: `We couldn't find any orders associated with ${email}.`,
                    variant: "destructive" // Optional: make it red to alert user
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-20 max-w-2xl min-h-[60vh]">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-serif font-bold mb-3 tracking-tight">Order Lookup</h1>
                <p className="text-muted-foreground">
                    Enter your email to view purchase history and resend download links.
                </p>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-sm border space-y-6 mb-10">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email address"
                            className="pl-10 h-12 text-base"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        className="h-12 px-8 text-base font-medium"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                Search
                                <Search className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </div>

            {/* Results Section */}
            {hasSearched && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {orders.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between pb-2 border-b">
                                <h2 className="text-lg font-medium">Found {orders.length} Order{orders.length !== 1 ? 's' : ''}</h2>
                                <span className="text-sm text-muted-foreground">for {email}</span>
                            </div>
                            <div className="space-y-3">
                                {orders.map((order) => (
                                    <GuestOrderCard key={order.id} order={order} email={email} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                            <p className="text-lg font-medium mb-1">No orders found</p>
                            <p className="text-muted-foreground text-sm">
                                Please check the email spelling or try a different address.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {!hasSearched && (
                <div className="text-center mt-12">
                    <Link href="/shop" className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                        Return to Shop
                    </Link>
                </div>
            )}
        </div>
    );
}
