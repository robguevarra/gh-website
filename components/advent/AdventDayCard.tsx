'use client';

import { motion } from 'framer-motion';
import { Lock, Sparkles, Check, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdventDay, AdventDayStatus } from '@/lib/advent-config';

interface AdventDayCardProps {
    dayConfig: AdventDay;
    status: AdventDayStatus;
    onClick: (day: AdventDay) => void;
}

export function AdventDayCard({ dayConfig, status, onClick }: AdventDayCardProps) {
    const isLocked = status === 'locked';
    const isOpened = status === 'opened';
    const isAvailable = status === 'available' || status === 'today';
    const isToday = status === 'today';

    return (
        <motion.button
            onClick={() => !isLocked && onClick(dayConfig)}
            className={cn(
                "relative group w-full aspect-[4/5] rounded-xl overflow-hidden shadow-sm transition-all duration-300",
                isLocked ? "cursor-not-allowed" : "cursor-pointer hover:shadow-xl",
                isAvailable && !isOpened && "ring-4 ring-brand-purple/20 shadow-brand-purple/20 scale-[1.02]",
                isOpened && "opacity-90"
            )}
            whileHover={!isLocked ? { scale: 1.03, rotateX: 2, rotateY: 2 } : {}}
            whileTap={!isLocked ? { scale: 0.98 } : {}}
            style={{ perspective: 1000 }}
        >
            {/* Background & Texture */}
            <div className={cn(
                "absolute inset-0 transition-colors duration-500",
                isLocked && "bg-[#eaddd7] opacity-80", // Muted warm gray/beige
                (isAvailable || isOpened) && "bg-gradient-to-br from-brand-purple to-brand-pink",
            )}>
                {/* Texture Pattern Overlay */}
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}
                />
            </div>

            {/* Glassmorphism Overlay (Simulates "Frosting" when locked) */}
            {isLocked && (
                <div className="absolute inset-0 backdrop-blur-[2px] bg-white/30" />
            )}

            {/* Ribbon Visual (CSS Only) */}
            {!isOpened && (
                <div className="absolute inset-0 pointer-events-none">
                    {/* Vertical Ribbon */}
                    <div className="absolute left-1/2 -translate-x-1/2 h-full w-4 bg-white/20 shadow-sm backdrop-blur-sm" />
                    {/* Horizontal Ribbon */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-4 bg-white/20 shadow-sm backdrop-blur-sm" />
                </div>
            )}

            {/* Content Layer */}
            <div className="relative h-full flex flex-col items-center justify-center p-4 text-center z-10">
                <span className={cn(
                    "text-5xl font-serif font-bold mb-2 transition-colors drop-shadow-sm",
                    isLocked ? "text-[#8d6e63]/50" : "text-white"
                )}>
                    {dayConfig.day}
                </span>

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

                {isOpened && (
                    <div className="flex flex-col items-center text-white/90 mt-2">
                        <div className="bg-white/20 p-1.5 rounded-full mb-1">
                            <Check className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Revealed</span>
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
        </motion.button>
    );
}
