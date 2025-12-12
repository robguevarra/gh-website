'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ProductData } from '@/lib/stores/student-dashboard'; // Reuse type
import { createPublicSalePaymentIntent } from '@/app/actions/public-sale-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PublicCheckoutFormProps {
    product: ProductData;
}

export function PublicCheckoutForm({ product }: PublicCheckoutFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Amount in cents (assuming PHP based on project context)
            const amountInCents = Math.round(product.price * 100);

            const response = await createPublicSalePaymentIntent({
                amount: amountInCents,
                currency: 'PHP', // Defaulting to PHP as per project context
                paymentMethod: 'invoice', // or 'card', intent creates invoice usually
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                productCode: product.handle,
                productName: product.title,
                originalPrice: product.compare_at_price ? Math.round(product.compare_at_price * 100) : undefined,
                metadata: {
                    source: 'advent_calendar',
                    product_id: product.id,
                    image_url: product.featured_image_url
                }
            });

            if (response.error || !response.invoice_url) {
                throw new Error(response.message || 'Payment initialization failed');
            }

            // Redirect to Xendit Invoice
            window.location.href = response.invoice_url;

        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl border border-brand-pink/20 overflow-hidden"
            >
                {/* Header */}
                <div className="bg-brand-purple/10 p-6 border-b border-brand-purple/10">
                    <h2 className="text-xl font-serif text-brand-purple mb-1">SECURE CHECKOUT</h2>
                    <div className="flex items-center text-sm text-slate-500">
                        <Lock className="w-3 h-3 mr-1" />
                        <span>256-bit SSL Encrypted</span>
                    </div>
                </div>

                {/* Product Summary */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                    {product.featured_image_url && (
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border border-slate-200">
                            <img src={product.featured_image_url} alt={product.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 className="font-medium text-slate-800 line-clamp-2">{product.title}</h3>
                        <p className="text-brand-purple font-bold">
                            {/* Assuming utility function or simple format */}
                            ₱{product.price.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                name="firstName"
                                required
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="border-slate-200 focus-visible:ring-brand-purple"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                name="lastName"
                                required
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className="border-slate-200 focus-visible:ring-brand-purple"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Where should we send your gift?"
                            className="border-slate-200 focus-visible:ring-brand-purple"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 mt-4 bg-brand-purple hover:bg-brand-purple/90 text-white text-lg shadow-lg shadow-brand-purple/20"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Complete Payment
                            </>
                        )}
                    </Button>

                    <p className="text-center text-xs text-slate-400 mt-2">
                        By purchasing, you agree to our Terms of Service.
                    </p>
                </form>
            </motion.div>
        </div>
    );
}
