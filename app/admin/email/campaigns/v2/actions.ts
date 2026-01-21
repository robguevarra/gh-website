'use server'

import { createServerSupabaseClient as createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AudienceSelection } from './components/audience-selector'

export async function createCampaign(formData: {
    name: string
    subject: string
    preview_text: string
    audience: AudienceSelection
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const { data, error } = await supabase
        .from('email_campaigns_v2')
        .insert({
            name: formData.name,
            subject: formData.subject,
            preview_text: formData.preview_text,
            audience_config: formData.audience, // Storing query config as JSON
            status: 'draft',
            created_by: user.id
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating campaign:', error)
        throw new Error('Failed to create campaign')
    }

    revalidatePath('/admin/email/campaigns')

    // We will redirect to the editor or overview page
    // For now, let's assume we have an editor route
    return { campaignId: data.id }
}
