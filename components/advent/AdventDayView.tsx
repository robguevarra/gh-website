'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Gift, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdventDay } from '@/lib/advent-config';
import { ProductData } from '@/lib/stores/student-dashboard';
import { formatPrice, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AdventDayViewProps {
    dayNumber: number;
    dayConfig: AdventDay;
    product: ProductData;
}

export function AdventDayView({ dayNumber, dayConfig, product }: AdventDayViewProps) {
    const router = useRouter();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);

    // If needed, we can check if it's "available" and auto-reveal, but usually user interaction is desired.
    // For now, keeping "Click to Reveal" as the interaction.

    // Derived Images
    const displayImages = product?.images && product.images.length > 0
        ? product.images
        : product?.featured_image_url ? [product.featured_image_url] : [];

    const handleReveal = () => {
        setIsRevealed(true);
    };

    const nextImage = () => {
        if (displayImages.length === 0) return;
        setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevImage = () => {
        if (displayImages.length === 0) return;
        setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    return (
        <div className="min-h-screen bg-[#f9f6f2] pb-20">
            {/* Header / Nav */}
            <div className="sticky top-0 z-40 bg-[#f9f6f2]/80 backdrop-blur-md px-4 py-3 border-b border-brand-purple/10 flex items-center justify-between">
                <Link href="/advent" className="flex items-center text-brand-purple font-medium hover:text-brand-purple/80 transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-1" />
                    <span className="hidden sm:inline">Back to Advent</span>
                </Link>
                <div className="font-serif font-bold text-[#5d4037] text-lg">
                    Day {dayNumber}
                </div>
                <div className="w-[80px]" /> {/* Spacer for balance */}
            </div>

            <main className="container max-w-lg mx-auto px-4 py-6">
                <AnimatePresence mode="wait">
                    {!isRevealed ? (
                        /* UNWRAP INTERACTION */
                        <motion.button
                            key="wrapper"
                            onClick={handleReveal}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                            className="w-full aspect-[4/5] bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center cursor-pointer group hover:scale-[1.02] transition-transform duration-500 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 to-brand-gold/5" />

                            <motion.div
                                animate={{ y: [0, -15, 0], rotate: [0, 2, -2, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="relative z-10"
                            >
                                <Gift className="w-32 h-32 text-brand-purple stroke-[1.5]" />
                            </motion.div>

                            <div className="mt-8 text-center relative z-10">
                                <h1 className="text-3xl font-serif text-[#5d4037] mb-2">Day {dayNumber}</h1>
                                <p className="text-[#8d6e63]">Tap to Unwrap Your Gift</p>
                            </div>

                            <div className="absolute bottom-8 left-0 right-0 text-center">
                                <span className="inline-block px-4 py-2 bg-white/80 backdrop-blur rounded-full text-xs font-bold uppercase tracking-widest text-brand-purple shadow-sm">
                                    Click to Reveal
                                </span>
                            </div>
                        </motion.button>
                    ) : (
                        /* REVEALED CONTENT */
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ease: "easeOut", duration: 0.5 }}
                            className="space-y-6"
                        >
                            {/* Image Carousel */}
                            <div className="relative aspect-square w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 group">
                                {displayImages.length > 0 ? (
                                    <>
                                        <Image
                                            src={displayImages[currentImageIndex]}
                                            alt={product.title || `Day ${dayNumber} Product`}
                                            fill
                                            className="object-contain p-4"
                                            sizes="(max-width: 768px) 100vw, 500px"
                                            priority
                                        />

                                        {/* Navigation Arrows */}
                                        {displayImages.length > 1 && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full shadow-md text-slate-700 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full shadow-md text-slate-700 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>

                                                {/* Dots Indicator */}
                                                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                                                    {displayImages.map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                                idx === currentImageIndex ? "bg-brand-purple w-3" : "bg-black/10"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ShoppingBag className="w-16 h-16 opacity-30" />
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Strip (Visible if > 1 image) */}
                            {displayImages.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-slate-200">
                                    {displayImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImageIndex(idx)}
                                            className={cn(
                                                "relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                                                idx === currentImageIndex
                                                    ? 'border-brand-purple ring-1 ring-brand-purple/30'
                                                    : 'border-transparent opacity-70 hover:opacity-100 bg-white'
                                            )}
                                        >
                                            <Image
                                                src={img}
                                                alt={`Thumbnail ${idx + 1}`}
                                                fill
                                                className="object-cover"
                                                sizes="64px"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Product Info */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                                <h1 className="text-2xl font-serif text-[#5d4037] leading-tight">
                                    {product.title}
                                </h1>

                                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                                    <span className="text-3xl font-bold text-brand-purple">
                                        {formatPrice(product.price)}
                                    </span>
                                    {product.compare_at_price && (
                                        <span className="text-lg text-slate-400 line-through">
                                            {formatPrice(product.compare_at_price)}
                                        </span>
                                    )}
                                </div>

                                <div
                                    className="prose prose-sm prose-chocolate max-w-none text-slate-600"
                                    dangerouslySetInnerHTML={{
                                        __html: product.description_html || "<p>No description available.</p>"
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Sticky Action Footer */}
            {isRevealed && product && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-50">
                    <div className="container max-w-lg mx-auto flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Total</span>
                            <span className="font-bold text-brand-purple text-xl leading-none">
                                {formatPrice(product.price)}
                            </span>
                        </div>
                        <Button asChild className="flex-1 h-12 rounded-full text-base shadow-lg shadow-brand-purple/20 bg-gradient-to-r from-brand-purple to-brand-pink hover:bg-gradient-to-l transition-all">
                            <Link href={`/advent/checkout?product=${product.handle || ''}`}>
                                Grab This Gift
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
