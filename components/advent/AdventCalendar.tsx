'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdventDay, ADVENT_DAYS, getAdventDayStatus, AdventDayStatus } from '@/lib/advent-config';
import { AdventDayCard } from './AdventDayCard';
import { AdventProductModal } from './AdventProductModal';
import { useAdventProgress } from '@/lib/hooks/use-advent-progress';

export function AdventCalendar() {
    // const [mounted, setMounted] = useState(false); // Helper moved to hook
    const { openedDays, markAsOpened, mounted } = useAdventProgress();
    const [selectedDay, setSelectedDay] = useState<AdventDay | null>(null);

    const handleDayClick = (day: AdventDay) => {
        setSelectedDay(day);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (!mounted) return null; // Or a loading skeleton

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
                {ADVENT_DAYS.map((dayConfig) => {
                    let status = getAdventDayStatus(dayConfig);

                    // If it's available (past/today) AND in our opened list, mark as opened
                    if ((status === 'available' || status === 'today') && openedDays.includes(dayConfig.day)) {
                        status = 'opened';
                    }

                    return (
                        <motion.div key={dayConfig.day} variants={item}>
                            <AdventDayCard
                                dayConfig={dayConfig}
                                status={status}
                                onClick={handleDayClick}
                            />
                        </motion.div>
                    );
                })}
            </motion.div>

            <AdventProductModal
                isOpen={!!selectedDay}
                onClose={() => setSelectedDay(null)}
                dayConfig={selectedDay}
                onOpenGift={() => selectedDay && markAsOpened(selectedDay.day)}
            />
        </div>
    );
}
