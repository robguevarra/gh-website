import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    // 1. Authorization
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    const supabase = await createServiceRoleClient()
    const THRESHOLD_MINUTES = 30
    const ABANDONMENT_TEMPLATE_ID = 'abandonment-v1' // Template Key or ID

    try {
        // 2. Find Candidates (Leads > 30m ago, No Enrollment)
        // Using a raw query for complex join/exclusion logic efficiently
        // Note: In Supabase/PostgREST, "not.exist" is tricky on cross-tables without View.
        // We will use the `view_directory_contacts` if it has enrollment info, or just raw SQL via RPC/Edge Function.
        // For simplicity here, we'll fetch recent leads and filter in app (if volume is low < 1000/hr) OR uses a direct query if possible.
        // Let's assume we can fetch leads created between 30m and 45m ago (processing window).

        const now = new Date()
        const windowStart = new Date(now.getTime() - (THRESHOLD_MINUTES + 15) * 60000).toISOString()
        const windowEnd = new Date(now.getTime() - THRESHOLD_MINUTES * 60000).toISOString()

        const { data: leads, error: leadError } = await supabase
            .from('purchase_leads')
            .select('id, email, first_name')
            .gte('created_at', windowStart)
            .lte('created_at', windowEnd)

        if (leadError) throw leadError
        if (!leads || leads.length === 0) return NextResponse.json({ message: 'No recent leads in window' })

        let queued = 0

        for (const lead of leads) {
            // 3. Check for Conversion (Enrollment)
            // We check if this email is in unified_profiles (Customer) AND has an enrollment
            // Or just check enrollments linked to this email (if we store email in enrollments or via user_id)
            // Unified way: Check view_directory_contacts for this email and type='customer'? 
            // Better: Check `enrollments` table directly by email lookup (via user's email).

            // Get user_id if exists
            const { data: user } = await supabase.from('unified_profiles').select('id').eq('email', lead.email).single()

            if (user) {
                const { data: enrollment } = await supabase
                    .from('enrollments')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .maybeSingle()

                if (enrollment) continue // Already converted!
            }

            // 4. Check for Duplicate (Already queued/sent)
            const { data: existingJob } = await supabase
                .from('email_jobs')
                .select('id')
                .eq('recipient_email', lead.email)
                .eq('campaign_id', ABANDONMENT_TEMPLATE_ID) // We use campaign_id to track this flow
                .maybeSingle()

            if (existingJob) continue // Already processed

            // 5. Queue Email
            await supabase.from('email_jobs').insert({
                campaign_id: ABANDONMENT_TEMPLATE_ID,
                recipient_email: lead.email,
                recipient_resource: { type: 'lead', id: lead.id },
                subject: `Did you forget something, ${lead.first_name || 'Friend'}?`,
                content: {
                    html: `<p>Hi ${lead.first_name || 'there'},</p><p>We noticed you started checking out but didn't finish.</p><p><a href="https://gracefulhomeschooling.com/checkout">Complete your enrollment here</a></p>`,
                    text: `Hi ${lead.first_name || 'there'}, We noticed you started checking out. Complete here: https://gracefulhomeschooling.com/checkout`
                },
                status: 'pending',
                stream_type: 'transactional',
                scheduled_at: new Date().toISOString() // Send immediately (next worker tick)
            })

            queued++
        }

        return NextResponse.json({
            checked: leads.length,
            queued
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
