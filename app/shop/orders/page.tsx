'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { sendGuestAccessLink } from '@/app/actions/guest-access';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

export default function GuestOrderLoginPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await sendGuestAccessLink(email);
            if (result.error) {
                toast({
                    title: 'Error',
                    description: result.error,
                    variant: 'destructive',
                });
            } else {
                setIsSent(true);
                toast({
                    title: 'Link Sent!',
                    description: 'Check your email for your access link.',
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

    if (isSent) {
        return (
            <div className="container mx-auto px-4 py-32 max-w-lg text-center">
                <div className="bg-primary/5 p-8 rounded-2xl border border-primary/10">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                        <CheckCircle2 size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
                    <p className="text-muted-foreground mb-8 text-lg">
                        We've sent a secure access link to <strong>{email}</strong>.
                        <br />Click the link in the email to view your orders.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button variant="outline" onClick={() => setIsSent(false)}>
                            Try a different email
                        </Button>
                        <Button asChild variant="link">
                            <Link href="/shop">Return to Shop</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-32 max-w-lg">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-serif font-bold mb-4 tracking-tight">Track Your Orders</h1>
                <p className="text-muted-foreground text-lg">
                    Enter your email address to manage your digital downloads and view order history.
                    No password required.
                </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-sm border space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                            Email Address used at checkout
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                className="pl-10 h-12 text-base"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg font-medium"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Sending Link...
                            </>
                        ) : (
                            <>
                                Send Access Link
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </form>

                <div className="pt-4 border-t text-center text-sm text-muted-foreground">
                    <p className="mb-2">Need help?</p>
                    <a href="mailto:support@gracefulhomeschooling.com" className="text-primary hover:underline">
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
}
