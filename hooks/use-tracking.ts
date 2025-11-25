'use client';

import { useCallback } from 'react';
import { trackEvent } from '@/app/actions/tracking-actions';

const VISITOR_ID_KEY = 'gh_visitor_id';
const PAGE_VIEW_ID_KEY = 'gh_page_view_id';

export function useTracking() {
    const track = useCallback(async (eventName: string, eventData?: Record<string, any>) => {
        try {
            const visitorId = localStorage.getItem(VISITOR_ID_KEY) || undefined;
            const pageViewId = sessionStorage.getItem(PAGE_VIEW_ID_KEY) || undefined;

            await trackEvent({
                eventName,
                eventData,
                visitorId,
                pageViewId,
            });
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }, []);

    return { track };
}
