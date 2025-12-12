import { startOfDay, isBefore, isAfter, addDays } from 'date-fns';

export interface AdventDay {
    day: number;
    revealDate: string; // YYYY-MM-DD
    shopifyHandle: string;
    placeholderTitle?: string;
    placeholderImage?: string;
    emailTemplate?: string;
}

// TODO: [USER CONFIG REQUIRED] Update these handles to match your actual Shopify product handles
export const ADVENT_DAYS: AdventDay[] = [
    { day: 1, revealDate: '2025-12-13', shopifyHandle: 'gh-christmas-advent-calendar-day-13', placeholderTitle: 'Day 1 Surprise', emailTemplate: '12 Days of Christmas Day 1' },
    { day: 2, revealDate: '2025-12-14', shopifyHandle: 'gh-christmas-advent-calendar-day-14', placeholderTitle: 'Day 2 Surprise', emailTemplate: '12 Days of Christmas Day 2' },
    { day: 3, revealDate: '2025-12-15', shopifyHandle: 'gh-christmas-advent-calendar-day-15', placeholderTitle: 'Day 3 Surprise', emailTemplate: '12 Days of Christmas Day 3' },
    { day: 4, revealDate: '2025-12-16', shopifyHandle: 'gh-christmas-advent-calendar-day-16', placeholderTitle: 'Day 4 Surprise', emailTemplate: '12 Days of Christmas Day 4' },
    { day: 5, revealDate: '2025-12-17', shopifyHandle: 'gh-christmas-advent-calendar-day-17', placeholderTitle: 'Day 5 Surprise', emailTemplate: '12 Days of Christmas Day 5' },
    { day: 6, revealDate: '2025-12-18', shopifyHandle: 'gh-christmas-advent-calendar-day-18', placeholderTitle: 'Day 6 Surprise', emailTemplate: '12 Days of Christmas Day 6' },
    { day: 7, revealDate: '2025-12-19', shopifyHandle: 'gh-christmas-advent-calendar-day-19', placeholderTitle: 'Day 7 Surprise', emailTemplate: '12 Days of Christmas Day 7' },
    { day: 8, revealDate: '2025-12-20', shopifyHandle: 'gh-christmas-advent-calendar-day-20', placeholderTitle: 'Day 8 Surprise', emailTemplate: '12 Days of Christmas Day 8' },
    { day: 9, revealDate: '2025-12-21', shopifyHandle: 'gh-christmas-advent-calendar-day-21', placeholderTitle: 'Day 9 Surprise', emailTemplate: '12 Days of Christmas Day 9' },
    { day: 10, revealDate: '2025-12-22', shopifyHandle: 'gh-christmas-advent-calendar-day-22', placeholderTitle: 'Day 10 Surprise', emailTemplate: '12 Days of Christmas Day 10' },
    { day: 11, revealDate: '2025-12-23', shopifyHandle: 'gh-christmas-advent-calendar-day-23', placeholderTitle: 'Day 11 Surprise', emailTemplate: '12 Days of Christmas Day 11' },
    { day: 12, revealDate: '2025-12-24', shopifyHandle: 'gh-christmas-advent-calendar-day-24', placeholderTitle: 'Day 12 Surprise', emailTemplate: '12 Days of Christmas Day 12' },
];

export type AdventDayStatus = 'locked' | 'available' | 'opened' | 'today';

export function getAdventDayStatus(day: AdventDay): AdventDayStatus {
    // Current time
    const now = new Date();

    // Create reveal date at 10 AM GMT+8 (Singapore/Manila time)
    // We treat the date string as UTC, then adjust. 
    // Actually, safest way is to construct a string with offset.
    // day.revealDate is 'YYYY-MM-DD'.

    // Construct ISO string for 10:00:00 at GMT+8
    // Format: YYYY-MM-DDT10:00:00+08:00
    // Note: '2025-12-1' -> '2025-12-01' needed for strict ISO
    const paddedDate = day.revealDate.split('-').map(part => part.padStart(2, '0')).join('-');
    const revealTimeStr = `${paddedDate}T10:00:00+08:00`;
    const revealTime = new Date(revealTimeStr);

    const nextDay = addDays(revealTime, 1);

    if (isBefore(now, revealTime)) {
        return 'locked';
    }

    // Active for 24 hours on the reveal date
    if (isAfter(now, revealTime) && isBefore(now, nextDay)) {
        return 'today';
    }

    return 'available';
}
