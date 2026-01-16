'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Package } from 'lucide-react';
import { resendOrderConfirmation } from '@/app/actions/guest-access';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrencyPHP } from '@/lib/utils/formatting';
import Image from 'next/image';

interface OrderItem {
    title: string;
    image?: string;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    date: string;
    total: number;
    status: string;
    number: string;
    items: OrderItem[];
}

interface GuestOrderCardProps {
    order: Order;
    email: string;
}

export function GuestOrderCard({ order, email }: GuestOrderCardProps) {
    const [isResending, setIsResending] = useState(false);
    const { toast } = useToast();

    const handleResend = async () => {
        setIsResending(true);
        try {
            const result = await resendOrderConfirmation(order.id, email);
            if ('success' in result && result.success) {
                toast({
                    title: 'Email Sent!',
                    description: 'Check your inbox for the order confirmation and download links.',
                });
            } else {
                toast({
                    title: 'Failed',
                    // @ts-ignore - we check for success so error likely exists if not success, or generic error
                    description: ('error' in result ? result.error : 'Could not resend email.'),
                    variant: 'destructive',
                });
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Package className="h-5 w-5 text-muted-foreground" />
                            Order #{order.number || order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Placed on {new Date(order.date).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant={order.status === 'processing' ? 'default' : 'secondary'} className="capitalize">
                            {order.status}
                        </Badge>
                        <span className="font-semibold text-lg">
                            {formatCurrencyPHP(order.total)}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="p-4 flex gap-4 items-center">
                            <div className="h-16 w-16 bg-muted rounded-md overflow-hidden relative flex-shrink-0 border">
                                {item.image ? (
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full w-full text-muted-foreground/50">
                                        <Package className="h-8 w-8" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate" title={item.title}>{item.title}</h4>
                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-sm">{formatCurrencyPHP(item.price)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="p-4 bg-muted/10 border-t flex justify-end gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResend}
                    disabled={isResending}
                    className="gap-2"
                >
                    {isResending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="h-4 w-4" />
                            Resend Email & Downloads
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
