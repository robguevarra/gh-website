'use server';

import { createServerSupabaseClient } from '@/lib/supabase/client';
import { headers } from 'next/headers';

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
    deviceType?: string;
    browser?: string;
    os?: string;
    metadata?: Record<string, any>;
}

export async function recordPageView(data: PageViewData) {
    const supabase = createServerSupabaseClient();
    const headersList = headers();

    try {
        // Get current user if authenticated (optional)
        const { data: { user } } = await supabase.auth.getUser();

        // Extract IP and Country from headers
        const forwardedFor = headersList.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : headersList.get('x-real-ip');
        const country = headersList.get('x-vercel-ip-country') || headersList.get('cf-ipcountry');
        const city = headersList.get('x-vercel-ip-city'); // Vercel specific

        const { data: insertedData, error } = await supabase.from('page_views').insert({
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
            ip_address: ip,
            country: country,
            city: city,
            device_type: data.deviceType,
            browser: data.browser,
            os: data.os,
            user_id: user?.id,
            metadata: data.metadata || {},
        }).select('id').single();

        if (error) {
            console.error('Error recording page view:', error);
            // Don't throw to avoid disrupting the user experience
            return { success: false, error: error.message };
        }

        return { success: true, id: insertedData?.id };
    } catch (err) {
        console.error('Unexpected error recording page view:', err);
        return { success: false, error: 'Internal server error' };
    }
}

export async function updatePageDuration(id: string, duration: number) {
    const supabase = createServerSupabaseClient();

    try {
        const { error } = await supabase
            .from('page_views')
            .update({ duration })
            .eq('id', id);

        if (error) {
            console.error('Error updating page duration:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected error updating page duration:', err);
        return { success: false, error: 'Internal server error' };
    }
}

export interface EventData {
    eventName: string;
    eventData?: Record<string, any>;
    pageViewId?: string;
    visitorId?: string;
}

export async function trackEvent(data: EventData) {
    const supabase = createServerSupabaseClient();

    try {
        const { error } = await supabase.from('events').insert({
            event_name: data.eventName,
            event_data: data.eventData || {},
            page_view_id: data.pageViewId,
            visitor_id: data.visitorId,
        });

        if (error) {
            console.error('Error recording event:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected error recording event:', err);
        return { success: false, error: 'Internal server error' };
    }
}
