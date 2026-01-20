'use server'

import { getCampaignById } from '@/lib/supabase/data-access/campaign-management'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function createCampaign(data: {
    subject: string
    previewText: string
    audienceId: string | null
    streamType: string
    designJson: any
    htmlContent: string
    templateId?: string | null
    name?: string
}) {
    const admin = await createServerSupabaseClient()

    // Determine Segment IDs (array)
    let segmentIds: string[] = []
    if (data.audienceId) {
        segmentIds = [data.audienceId]
    }

    // Generate Segment Rules (Required by Send API)
    const segmentRules = {
        include: {
            segmentIds: segmentIds
        },
        exclude: {
            segmentIds: []
        }
    }

    // Handle Template ID (Fallback to 'Fixed Newsletter' generic template if null)
    // ID: a96914ae-92f6-483a-90ec-f224599adf9f
    const DEFAULT_TEMPLATE_ID = 'a96914ae-92f6-483a-90ec-f224599adf9f'
    const finalTemplateId = data.templateId || DEFAULT_TEMPLATE_ID

    const { data: campaign, error } = await admin
        .from('email_campaigns')
        .insert({
            name: data.name || data.subject || 'Untitled Campaign',
            subject: data.subject,
            description: data.previewText,
            // stream_type: data.streamType, // Column not in schema yet
            segment_ids: segmentIds,
            segment_rules: segmentRules,
            template_id: finalTemplateId, // Use provided or fallback
            sender_name: 'Graceful Homeschooling',
            sender_email: 'hello@gracefulhomeschooling.com',
            content_json: data.designJson,
            campaign_design_json: data.designJson,
            campaign_html_body: data.htmlContent,
            status: 'draft',
            created_at: new Date().toISOString()
        } as any) // Casting as any to avoid strict type checks on partial insert
        .select('id')
        .single()

    if (error) {
        console.error('Failed to create campaign:', error)
        throw new Error(error.message)
    }

    return (campaign as any).id
}

export async function getCampaignForWizard(id: string) {
    try {
        const campaign = await getCampaignById(id)
        if (!campaign) throw new Error('Campaign not found')

        // Return only what the wizard needs
        return {
            id: campaign.id,
            name: campaign.name,
            subject: campaign.subject,
            previewText: campaign.description, // Mapping description to previewText as fallback
            audienceId: (campaign.segment_ids && campaign.segment_ids.length > 0) ? campaign.segment_ids[0] : null,
            designJson: campaign.content_json || campaign.campaign_design_json,
            htmlContent: campaign.campaign_html_body,
            scheduleAt: campaign.scheduled_at,
            status: campaign.status
        }
    } catch (error) {
        console.error('Failed to fetch campaign for wizard:', error)
        throw error
    }
}

export async function getAudiences() {
    const admin = await createServerSupabaseClient()

    // 1. Fetch Smart Lists (CRM)
    const { data: smartLists } = await admin
        .from('crm_smart_lists')
        .select('id, name, created_at, user_count')
        .order('name')

    // 2. Fetch Segments (Marketing)
    const { data: rawSegments } = await admin
        .from('segments')
        .select('id, name, description, user_segments(count)')
        .order('name')

    const segments = rawSegments?.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        user_count: s.user_segments?.[0]?.count || 0
    }))

    return {
        smartLists: smartLists || [],
        segments: segments || []
    }
}

export async function getAudienceDetails(id: string | null) {
    if (!id || id === 'all_users') return { name: 'All Active Users', count: null, type: 'broadcast' }

    const admin = await createServerSupabaseClient()

    // Try Smart List first
    const { data: smartList } = await admin.from('crm_smart_lists').select('name, user_count').eq('id', id).maybeSingle()
    if (smartList) return { name: (smartList as any).name, count: (smartList as any).user_count, type: 'smart_list' }

    // Try Segment
    const { data: segment } = await admin.from('segments').select('name').eq('id', id).maybeSingle()
    if (segment) {
        // Calculate count from user_segments link table
        const { count } = await admin
            .from('user_segments')
            .select('*', { count: 'exact', head: true })
            .eq('segment_id', id)

        return { name: (segment as any).name, count: count, type: 'segment' }
    }

    return { name: 'Unknown Audience', count: null, type: 'unknown' }
}

export async function duplicateCampaign(originalId: string) {
    const admin = await createServerSupabaseClient()

    // Fetch original
    const { data: original, error: fetchError } = await admin
        .from('email_campaigns')
        .select('*')
        .eq('id', originalId)
        .single()

    if (fetchError || !original) throw new Error('Original campaign not found')

    // Cast to any to avoid strict type checks on insert for now
    const campaignData: any = original

    // Create copy
    const { data: newCampaign, error: createError } = await admin
        .from('email_campaigns')
        .insert({
            name: `${campaignData.name} (Copy)`,
            subject: campaignData.subject,
            description: campaignData.description,
            status: 'draft',
            template_id: campaignData.template_id,
            campaign_design_json: campaignData.campaign_design_json,
            campaign_html_body: campaignData.campaign_html_body,
            content_json: campaignData.content_json,
            segment_ids: campaignData.segment_ids,
            segment_rules: campaignData.segment_rules,
            settings: campaignData.settings,
            sender_email: campaignData.sender_email,
            sender_name: campaignData.sender_name,
            is_ab_test: campaignData.is_ab_test,
            completed_at: null,
            scheduled_at: null
        } as any)
        .select('id')
        .single()

    if (createError || !newCampaign) throw new Error('Failed to create copy')

    return (newCampaign as { id: string }).id
}


export async function getTemplates() {
    console.log('[getTemplates] Starting fetch via Service Role...')
    try {
        const admin = await createServiceRoleClient()

        // Select 'design' instead of 'json_content' and skip 'thumbnail_url' as it doesn't exist
        const { data: templates, error } = await admin
            .from('email_templates')
            .select('id, name, description, design')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getTemplates] Supabase Error:', error)
            throw new Error(error.message)
        }

        console.log(`[getTemplates] Success. Found ${templates?.length} templates.`)

        // Map to expected interface
        return templates?.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            thumbnail_url: null,
            json_content: t.design
        })) || []

    } catch (err) {
        console.error('[getTemplates] Unexpected error:', err)
        return []
    }
}

export async function refreshAudiences() {
    const admin = await createServiceRoleClient()
    const { error } = await admin.functions.invoke('update-all-user-segments')

    if (error) {
        console.error('Failed to refresh audiences:', error)
        throw new Error('Failed to restart audience sync')
    }

    return true
}
