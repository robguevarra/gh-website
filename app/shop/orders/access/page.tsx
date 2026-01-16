import { validateGuestToken, getGuestOrders } from '@/app/actions/guest-access';
import { GuestOrderCard } from '@/components/shop/GuestOrderCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

interface PageProps {
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function GuestOrderAccessPage({ searchParams }: PageProps) {
    const token = typeof searchParams.token === 'string' ? searchParams.token : null;

    if (!token) {
        redirect('/shop/orders');
    }

    const authResult = await validateGuestToken(token);

    if (authResult.error || !authResult.email) {
        return (
            <div className="container mx-auto px-4 py-32 max-w-lg text-center">
                <div className="bg-destructive/5 p-8 rounded-2xl border border-destructive/10">
                    <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6 text-destructive">
                        <AlertCircle size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Link Expired or Invalid</h1>
                    <p className="text-muted-foreground mb-8 text-lg">
                        This access link has expired or is invalid. Please request a new one.
                    </p>
                    <Button asChild size="lg">
                        <Link href="/shop/orders">Request New Link</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const { email } = authResult;
    const orders = await getGuestOrders(email);

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="mb-8">
                <Button asChild variant="ghost" size="sm" className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/shop" className="flex items-center gap-1">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Shop
                    </Link>
                </Button>

                <h1 className="text-3xl font-serif font-bold tracking-tight mb-2">My Orders</h1>
                <p className="text-muted-foreground">
                    Viewing orders for <span className="font-semibold text-foreground">{email}</span>
                </p>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
                    <p className="text-xl font-medium mb-2">No orders found</p>
                    <p className="text-muted-foreground mb-6">We couldn't find any orders associated with this email address.</p>
                    <Button asChild>
                        <Link href="/shop">Start Shopping</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <GuestOrderCard key={order.id} order={order} email={email} />
                    ))}
                </div>
            )}
        </div>
    );
}
