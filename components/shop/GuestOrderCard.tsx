'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { resendOrderConfirmation } from '@/app/actions/guest-access';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrencyPHP } from '@/lib/utils/formatting';

interface OrderSummary {
    id: string;
    date: string;
    total: number;
    status: string;
    maskedNumber: string;
}

interface GuestOrderCardProps {
    order: OrderSummary;
    email: string;
}

export function GuestOrderCard({ order, email }: GuestOrderCardProps) {
    const [isResending, setIsResending] = useState(false);
    const [justSent, setJustSent] = useState(false);
    const { toast } = useToast();

    const handleResend = async () => {
        setIsResending(true);
        try {
            const result = await resendOrderConfirmation(order.id, email);
            if ('success' in result && result.success) {
                setJustSent(true);
                toast({
                    title: 'Email Sent!',
                    description: `Confirmation for order ${order.maskedNumber} sent.`,
                });
                // Reset "Just Sent" status after 10 seconds to allow re-send if needed
                setTimeout(() => setJustSent(false), 10000);
            } else {
                toast({
                    title: 'Failed',
                    description: ('error' in result ? result.error : 'Could not resend email.') as string,
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border rounded-lg shadow-sm gap-4 transition-all hover:border-primary/20">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-lg tracking-wide">{order.maskedNumber}</span>
                    <Badge variant={order.status === 'processing' || order.status === 'paid' ? 'default' : 'secondary'} className="capitalize text-xs">
                        {order.status}
                    </Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{new Date(order.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="font-medium text-foreground">{formatCurrencyPHP(order.total)}</span>
                </div>
            </div>

            <div>
                {justSent ? (
                    <Button variant="outline" size="sm" className="gap-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 cursor-default" disabled>
                        <CheckCircle2 className="h-4 w-4" />
                        Sent!
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResend}
                        disabled={isResending}
                        className="w-full sm:w-auto gap-2"
                    >
                        {isResending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4" />
                                Resend Email
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
