"use client";

import React, { useEffect, useState } from 'react';

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const TARGET_DATE = '2026-01-19T10:00:00+08:00';

export default function ShopCountdownOverlay() {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        const calculateTimeLeft = () => {
            const difference = +new Date(TARGET_DATE) - +new Date();

            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                };
            }
            return null;
        };

        // Initial calculation
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);

            if (!remaining) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!isMounted) return null; // Prevent hydration mismatch
    if (!timeLeft) return null; // Don't show if time passed

    return (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-xl">
            <div className="sticky top-0 h-screen w-full flex items-center justify-center">
                <div className="max-w-md w-full p-8 rounded-2xl bg-white/10 border border-white/20 shadow-2xl text-center space-y-8 backdrop-blur-md mx-4">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">
                            Store Launching Soon
                        </h2>
                        <p className="text-muted-foreground">
                            We are preparing something special for you.
                        </p>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <TimeUnit value={timeLeft.days} label="Days" />
                        <TimeUnit value={timeLeft.hours} label="Hours" />
                        <TimeUnit value={timeLeft.minutes} label="Mins" />
                        <TimeUnit value={timeLeft.seconds} label="Secs" />
                    </div>

                    <div className="text-sm font-medium text-muted-foreground pt-4">
                        January 19, 2026 • 10:00 AM (GMT+8)
                    </div>
                </div>
            </div>
        </div>
    );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                {value.toString().padStart(2, '0')}
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-1">
                {label}
            </div>
        </div>
    );
}
