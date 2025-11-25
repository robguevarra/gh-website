'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { recordPageView } from '@/app/actions/tracking-actions';

const VISITOR_ID_KEY = 'gh_visitor_id';
const SESSION_ID_KEY = 'gh_session_id';

export function PageTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const initialized = useRef(false);

    useEffect(() => {
        // Prevent double firing in React Strict Mode
        if (initialized.current) return;
        initialized.current = true;

        const trackPage = async () => {
            try {
                // 1. Get or create Visitor ID (persistent)
                let visitorId = localStorage.getItem(VISITOR_ID_KEY);
                if (!visitorId) {
                    visitorId = uuidv4();
                    localStorage.setItem(VISITOR_ID_KEY, visitorId);
                }

                // 2. Get or create Session ID (session-based)
                let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
                if (!sessionId) {
                    sessionId = uuidv4();
                    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
                }

                // 3. Get Facebook Cookies
                const getCookie = (name: string) => {
                    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
                    return match ? match[2] : undefined;
                };
                const fbp = getCookie('_fbp');
                const fbc = getCookie('_fbc');

                // 4. Get UTM Parameters
                const utmSource = searchParams.get('utm_source') || undefined;
                const utmMedium = searchParams.get('utm_medium') || undefined;
                const utmCampaign = searchParams.get('utm_campaign') || undefined;
                const utmTerm = searchParams.get('utm_term') || undefined;
                const utmContent = searchParams.get('utm_content') || undefined;

                // 5. Record Page View
                await recordPageView({
                    url: window.location.href,
                    path: pathname,
                    referrer: document.referrer || undefined,
                    userAgent: navigator.userAgent,
                    visitorId,
                    sessionId,
                    utmSource,
                    utmMedium,
                    utmCampaign,
                    utmTerm,
                    utmContent,
                    fbp,
                    fbc,
                });
            } catch (error) {
                console.error('Tracking error:', error);
            }
        };

        // Small delay to ensure cookies/DOM are ready
        const timer = setTimeout(trackPage, 500);
        return () => clearTimeout(timer);
    }, [pathname, searchParams]); // Re-run on route change

    return null; // This component renders nothing
}
