import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, Check, Gift, Loader2 } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { AdventDay, AdventDayStatus } from '@/lib/advent-config';
import { getAdventProductByHandle } from '@/app/actions/store-actions';
import { ProductData } from '@/lib/stores/student-dashboard';
import Image from 'next/image';
import Link from 'next/link';

interface AdventDayCardProps {
    dayConfig: AdventDay;
    status: AdventDayStatus;
    onClick?: (day: AdventDay) => void;
    preloadedProduct?: ProductData;
    isLoading?: boolean;
}

export function AdventDayCard({ dayConfig, status, onClick, preloadedProduct, isLoading = false }: AdventDayCardProps) {
    const isLocked = status === 'locked';
    const isOpened = status === 'opened';
    const isAvailable = status === 'available' || status === 'today';
    const isToday = status === 'today';

    const product = preloadedProduct || null;
    // Removed local fetch logic to rely solely on parent's bulk fetch
    // This prevents N+1 request issues and race conditions

    // Hover Slideshow State
    const [isHovered, setIsHovered] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Slideshow Effect (Unchanged)
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isHovered && product && product.images && product.images.length > 1) {
            interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % (product.images?.length || 1));
            }, 1200); // Cycle every 1.2s
        } else {
            setCurrentImageIndex(0); // Reset when not hovered
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isHovered, product]);

    // Slideshow Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isHovered && product && product.images && product.images.length > 1) {
            interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % (product.images?.length || 1));
            }, 1200); // Cycle every 1.2s
        } else {
            setCurrentImageIndex(0); // Reset when not hovered
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isHovered, product]);

    // Determine image to show
    const displayImage = (product?.images && product.images.length > 0)
        ? product.images[currentImageIndex]
        : (product?.featured_image_url || '');

    // Card Content Wrapper
    const CardContent = (
        <div
            className={cn(
                "relative group w-full aspect-[4/5] rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
                status === 'locked' && "bg-[#2d1b1e] border border-white/5",
                status === 'available' && "bg-[#2d1b1e] border border-brand-gold/30 hover:border-brand-gold hover:shadow-[0_0_15px_rgba(251,191,36,0.2)]",
                status === 'today' && "bg-[#2d1b1e] border-2 border-brand-gold shadow-[0_0_20px_rgba(251,191,36,0.3)] animate-pulse-subtle",
                status === 'opened' && "bg-white border-none shadow-md hover:shadow-xl"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background & Texture */}
            <div className={cn(
                "absolute inset-0 transition-colors duration-500",
                isLocked && "bg-[#eaddd7] opacity-80", // Muted warm gray/beige
                (isAvailable && !isOpened) && "bg-gradient-to-br from-brand-purple to-brand-pink",
                isOpened && "bg-white",
            )}>
                {/* Texture Pattern Overlay for non-opened states */}
                {!isOpened && (
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}
                    />
                )}
            </div>

            {/* Glassmorphism Overlay (Simulates "Frosting" when locked) */}
            {isLocked && (
                <div className="absolute inset-0 backdrop-blur-[2px] bg-white/30" />
            )}

            {/* Ribbon Visual (CSS Only) - Hide when opened */}
            {!isOpened && (
                <div className="absolute inset-0 pointer-events-none">
                    {/* Vertical Ribbon */}
                    <div className="absolute left-1/2 -translate-x-1/2 h-full w-4 bg-white/20 shadow-sm backdrop-blur-sm" />
                    {/* Horizontal Ribbon */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-4 bg-white/20 shadow-sm backdrop-blur-sm" />
                </div>
            )}

            {/* Content Layer */}
            <div className="relative h-full flex flex-col items-center justify-center p-4 text-center z-10 w-full">

                {/* Number Display - Hide if opened and product loaded, or move it */}
                {(!isOpened || (!product && !isLoading)) && (
                    <span className={cn(
                        "text-5xl font-serif font-bold mb-2 transition-colors drop-shadow-sm",
                        isLocked ? "text-[#8d6e63]/50" : "text-white"
                    )}>
                        {dayConfig.day}
                    </span>
                )}

                {isLocked && (
                    <div className="flex flex-col items-center text-[#8d6e63]/70 mt-2">
                        <Lock className="w-5 h-5 mb-1 opacity-70" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Locked</span>
                    </div>
                )}

                {isAvailable && !isOpened && (
                    <div className="flex flex-col items-center text-white mt-1">
                        {isToday ? (
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                            >
                                <Sparkles className="w-8 h-8 mb-1 text-yellow-200 drop-shadow-md" />
                            </motion.div>
                        ) : (
                            <Gift className="w-6 h-6 mb-1 text-white/90 drop-shadow-md" />
                        )}
                        <span className="text-xs font-bold tracking-wide uppercase bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-md">Open Me</span>
                    </div>
                )}

                {/* Loading State for Opened Card */}
                {isOpened && isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-brand-purple/50">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-xs font-medium">Unwrapping...</span>
                    </div>
                )}

                {/* Product Display Logic */}
                {isOpened && !isLoading && product && (
                    <div className="absolute inset-0 flex flex-col">
                        {/* Image Container */}
                        <div className="relative flex-1 w-full bg-slate-50 overflow-hidden">
                            {displayImage ? (
                                <Image
                                    src={displayImage}
                                    alt={product.title || 'Product Image'}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-brand-purple/20">
                                    <Gift className="w-12 h-12" />
                                </div>
                            )}

                            {/* Day Badge Overlay */}
                            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-serif font-bold text-[#5d4037] shadow-sm z-10">
                                Day {dayConfig.day}
                            </div>
                        </div>

                        {/* Info Content */}
                        <div className="p-3 bg-white border-t border-slate-100 flex flex-col items-start text-left h-[35%] justify-between">
                            <h4 className="text-sm font-medium text-[#5d4037] line-clamp-2 leading-tight mb-1">
                                {product.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-auto">
                                <span className="font-bold text-brand-purple text-sm">
                                    {formatPrice(product.price)}
                                </span>
                                {product.compare_at_price && (
                                    <span className="text-[10px] text-slate-400 line-through">
                                        {formatPrice(product.compare_at_price)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Opened but no product state (error or empty) */}
                {isOpened && !isLoading && !product && (
                    <div className="flex flex-col items-center text-brand-purple/60 mt-2">
                        <div className="bg-brand-purple/10 p-2 rounded-full mb-1">
                            <Gift className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Revealed</span>
                        <span className="text-[9px] opacity-70 mt-1">Click to see</span>
                    </div>
                )}
            </div>

            {/* Shimmer Effect for Active Day */}
            {isAvailable && !isOpened && (
                <motion.div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                    animate={{ translateX: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                />
            )}
        </div>
    );

    // If locked, return just the div (non-clickable or handles its own click to show toast/shake)
    if (isLocked) {
        return (
            <div onClick={() => onClick && onClick(dayConfig)}>
                {CardContent}
            </div>
        )
    }

    // If available or opened, wrap in Link to the day page
    // Note: logic for 'available' (not opened yet) will go to page, and page handles 'reveal'
    return (
        <Link href={`/advent/day/${dayConfig.day}`} className="block w-full">
            {CardContent}
        </Link>
    );
}
