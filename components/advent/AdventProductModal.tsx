'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdventDay } from '@/lib/advent-config';
import { getAdventProductByHandle } from '@/app/actions/store-actions';
import { ProductData } from '@/lib/stores/student-dashboard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, AlertCircle, ShoppingBag, Gift, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AdventProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    dayConfig: AdventDay | null;
    onOpenGift?: () => void;
}

export function AdventProductModal({ isOpen, onClose, dayConfig, onOpenGift }: AdventProductModalProps) {
    const [product, setProduct] = useState<ProductData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false); // Track if user has clicked "Unwrap"
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        if (isOpen && dayConfig) {
            setLoading(true);
            setError(null);
            setProduct(null);
            setIsRevealed(false); // Reset reveal state on open
            setCurrentImageIndex(0);

            getAdventProductByHandle(dayConfig.shopifyHandle)
                .then((data) => {
                    if (data) {
                        setProduct(data);
                    } else {
                        console.warn(`Product not found for handle: ${dayConfig.shopifyHandle}`);
                        setError(`The special gift for Day ${dayConfig.day} is playing hide and seek! (Product not found)`);
                    }
                })
                .catch(() => setError("Something went wrong revealing your gift."))
                .finally(() => setLoading(false));
        }
    }, [isOpen, dayConfig]);

    const handleReveal = () => {
        setIsRevealed(true);
        if (onOpenGift) {
            onOpenGift();
        }
    };

    const nextImage = () => {
        if (!product?.images || product.images.length === 0) return;
        setCurrentImageIndex((prev) => (prev + 1) % product.images!.length);
    };

    const prevImage = () => {
        if (!product?.images || product.images.length === 0) return;
        setCurrentImageIndex((prev) => (prev - 1 + product.images!.length) % product.images!.length);
    };

    // Use images array if available, fallback to featured_image_url
    const displayImages = product?.images && product.images.length > 0
        ? product.images
        : product?.featured_image_url ? [product.featured_image_url] : [];

    if (!dayConfig) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-md bg-[#f9f6f2] border-brand-pink/20 overflow-hidden">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Day {dayConfig.day} Reveal</DialogTitle>
                    </DialogHeader>

                    <div className="relative min-h-[400px] flex flex-col items-center justify-center p-6 text-center">

                        {/* Loading State */}
                        {loading && (
                            <div className="flex flex-col items-center animate-pulse space-y-4">
                                <div className="w-20 h-20 bg-brand-purple/20 rounded-full animate-bounce" />
                                <p className="text-brand-purple/60 font-medium tracking-wide">Fetching your surprise...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {!loading && error && (
                            <div className="space-y-4 text-center">
                                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <p className="text-slate-600 max-w-xs mx-auto leading-relaxed">{error}</p>
                                <p className="text-xs text-slate-400 font-mono bg-slate-100 py-1 px-2 rounded">Handle: {dayConfig.shopifyHandle}</p>
                            </div>
                        )}

                        {/* Content Logic */}
                        {!loading && !error && product && (
                            <AnimatePresence mode="wait">
                                {!isRevealed ? (
                                    /* WRAPPED STATE */
                                    <motion.div
                                        key="wrapped"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.5, opacity: 0, rotate: 10 }}
                                        className="flex flex-col items-center cursor-pointer group"
                                        onClick={handleReveal}
                                    >
                                        <div className="relative">
                                            <motion.div
                                                animate={{
                                                    y: [0, -10, 0],
                                                    rotate: [0, 2, -2, 0]
                                                }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 4,
                                                    ease: "easeInOut"
                                                }}
                                                className="text-brand-purple drop-shadow-2xl"
                                            >
                                                <Gift className="w-40 h-40 stroke-[1.5px]" />
                                            </motion.div>

                                            {/* "Click Me" Hint */}
                                            <motion.div
                                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 1 }}
                                            >
                                                <span className="text-sm font-bold text-brand-purple/70 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                                    Tap to Unwrap
                                                </span>
                                            </motion.div>
                                        </div>

                                        <h2 className="mt-12 text-3xl font-serif text-[#5d4037]">Day {dayConfig.day}</h2>
                                        <p className="text-[#8d6e63] font-light">A special gift awaits you...</p>
                                    </motion.div>
                                ) : (
                                    /* REVEALED STATE */
                                    <motion.div
                                        key="revealed"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        className="w-full flex flex-col items-center space-y-6"
                                    >
                                        {/* Product Image / Gallery */}
                                        <motion.div
                                            className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden shadow-2xl bg-white p-2"
                                            initial={{ y: 20 }}
                                            animate={{ y: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-100 group">
                                                {displayImages.length > 0 ? (
                                                    <>
                                                        <Image
                                                            src={displayImages[currentImageIndex]}
                                                            alt={product.title}
                                                            fill
                                                            className="object-cover transition-transform duration-700 hover:scale-105 cursor-zoom-in"
                                                            onClick={() => setIsFullScreen(true)}
                                                        />

                                                        {/* Zoom Hint */}
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white p-1.5 rounded-full pointer-events-none">
                                                            <Maximize2 className="w-4 h-4" />
                                                        </div>

                                                        {/* Gallery Controls */}
                                                        {displayImages.length > 1 && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                                                                >
                                                                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                                                                >
                                                                    <ChevronRight className="w-4 h-4 text-slate-700" />
                                                                </button>
                                                                {/* Dots */}
                                                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                                                    {displayImages.map((_, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-brand-purple' : 'bg-white/60'}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                                                        <ShoppingBag className="w-12 h-12 opacity-20" />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>

                                        {/* Product Info */}
                                        <div className="text-center space-y-2 max-w-xs mx-auto">
                                            <motion.h3
                                                className="text-xl font-serif text-[#5d4037] leading-tight"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                            >
                                                {product.title}
                                            </motion.h3>

                                            <motion.div
                                                className="flex items-center justify-center gap-3"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                            >
                                                <span className="text-2xl font-bold text-brand-purple">
                                                    {formatPrice(product.price)}
                                                </span>
                                                {product.compare_at_price && (
                                                    <span className="text-[#8d6e63]/60 line-through text-sm decoration-1">
                                                        {formatPrice(product.compare_at_price)}
                                                    </span>
                                                )}
                                            </motion.div>
                                        </div>

                                        {/* Actions */}
                                        <motion.div
                                            className="w-full pt-2"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            <Button asChild className="w-full h-14 text-lg rounded-full shadow-xl shadow-brand-purple/20 bg-gradient-to-r from-brand-purple to-brand-pink hover:bg-gradient-to-l hover:scale-[1.02] transition-all duration-300">
                                                <Link href={`/advent/checkout?product=${product.handle || ''}`}>
                                                    Grab Gift Now
                                                </Link>
                                            </Button>
                                            <p className="text-center text-[10px] text-[#8d6e63]/60 mt-3 uppercase tracking-wider font-medium">
                                                Instant Digital Delivery
                                            </p>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                </DialogContent >
            </Dialog >

            {/* Full Screen Image Viewer */}
            <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
                <DialogContent className="max-w-[95vw] h-[90vh] bg-black/95 border-none p-0 flex flex-col items-center justify-center">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Full Screen Image</DialogTitle>
                    </DialogHeader>

                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsFullScreen(false)}
                            className="absolute top-4 right-4 z-50 text-white/80 hover:text-white bg-black/20 hover:bg-black/50 rounded-full p-2 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        {/* Navigation */}
                        {displayImages.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/20 hover:bg-black/50 rounded-full p-3 transition-colors z-50"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/20 hover:bg-black/50 rounded-full p-3 transition-colors z-50"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}

                        {/* Image */}
                        {displayImages.length > 0 && (
                            <div className="relative w-full h-full max-w-7xl max-h-[85vh]">
                                <Image
                                    src={displayImages[currentImageIndex]}
                                    alt={product?.title || 'Full screen image'}
                                    fill
                                    className="object-contain"
                                    quality={100}
                                />
                            </div>
                        )}

                        {/* Dots */}
                        {displayImages.length > 1 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                                {displayImages.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
