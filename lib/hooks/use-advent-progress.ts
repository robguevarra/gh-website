'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'gh_advent_progress_2025';

export function useAdventProgress() {
    const [openedDays, setOpenedDays] = useState<number[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setOpenedDays(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse advent progress', e);
            }
        }
    }, []);

    const markAsOpened = (day: number) => {
        setOpenedDays(prev => {
            if (prev.includes(day)) return prev;
            const next = [...prev, day];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const isDayOpened = (day: number) => openedDays.includes(day);

    return {
        openedDays,
        markAsOpened,
        isDayOpened,
        mounted
    };
}
