'use server';

import { createServerSupabaseClient } from '@/lib/supabase/client';

export interface PageViewData {
    url: string;
    path: string;
    referrer?: string;
    userAgent?: string;
    visitorId?: string;
    sessionId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    fbp?: string;
    fbc?: string;
    metadata?: Record<string, any>;
}

export async function recordPageView(data: PageViewData) {
    const supabase = createServerSupabaseClient();

    try {
        // Get current user if authenticated (optional)
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('page_views').insert({
            url: data.url,
            path: data.path,
            referrer: data.referrer,
            user_agent: data.userAgent,
            visitor_id: data.visitorId,
            session_id: data.sessionId,
            utm_source: data.utmSource,
            utm_medium: data.utmMedium,
            utm_campaign: data.utmCampaign,
            utm_term: data.utmTerm,
            utm_content: data.utmContent,
            fbp: data.fbp,
            fbc: data.fbc,
            user_id: user?.id,
            metadata: data.metadata || {},
        });

        if (error) {
            console.error('Error recording page view:', error);
            // Don't throw to avoid disrupting the user experience
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected error recording page view:', err);
        return { success: false, error: 'Internal server error' };
    }
}
