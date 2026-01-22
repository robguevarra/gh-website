'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SegmentRules, getUsersBySegmentRules } from "@/lib/segmentation/engine"

export async function calculateSegmentReach(rules: SegmentRules) {
    try {
        // Fetch count and a sample of 10 users for preview
        const result = await getUsersBySegmentRules(rules, 10, 0)
        return {
            count: result.count,
            sampleUsers: result.sampleUsers,
            error: null
        }
    } catch (error: any) {
        console.error('Error calculating segment reach:', error)
        return { count: 0, sampleUsers: [], error: error.message }
    }
}

export async function exportSegmentUsers(rules: SegmentRules) {
    try {
        // For export, we want ALL users. 
        // WARNING: For very large datasets, this should be streamed or batched.
        // For < 10k users, fetching all at once is acceptable but we need to increase the limit.
        // passing limit: 100000 
        const result = await getUsersBySegmentRules(rules, 100000, 0)
        return {
            users: result.sampleUsers,
            error: null
        }
    } catch (error: any) {
        console.error('Error exporting segment users:', error)
        return { users: [], error: error.message }
    }
}

// --- Template Actions ---

export async function getTemplates() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) throw error
        return { templates: data, error: null }
    } catch (error: any) {
        console.error('Error fetching templates:', error)
        return { templates: [], error: error.message }
    }
}

export async function getTemplate(id: string) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return { template: data, error: null }
    } catch (error: any) {
        console.error('Error fetching template:', error)
        return { template: null, error: error.message }
    }
}

// Helper to strip HTML
function stripHtml(html: string) {
    if (!html) return ''
    return html.replace(/<[^>]*>?/gm, '')
}

export async function createTemplate(data: { name: string, category: string, design: any, html: string, subject?: string }) {
    try {
        const supabase = await createServerSupabaseClient()

        const { data: template, error } = await supabase
            .from('email_templates')
            .insert({
                name: data.name,
                category: data.category,
                design: data.design,
                html_content: data.html,
                text_content: stripHtml(data.html), // Generate plain text
                subject: data.subject || data.name,
                version: 1,
                active: true,
                metadata: { createdBy: 'admin' } // Simplify for now
            })
            .select()
            .single()

        if (error) throw error
        return { template, error: null }
    } catch (error: any) {
        console.error('Error creating template:', error)
        return { template: null, error: error.message }
    }
}

export async function updateTemplate(id: string, data: { name?: string, design?: any, html?: string, subject?: string }) {
    try {
        const supabase = await createServerSupabaseClient()

        // First get current version
        const { data: current } = await supabase.from('email_templates').select('version').eq('id', id).single()
        const newVersion = (current?.version || 1) + 1

        const updateData: any = {
            updated_at: new Date().toISOString(),
            version: newVersion
        }
        if (data.name) updateData.name = data.name
        if (data.design) updateData.design = data.design
        if (data.html) {
            updateData.html_content = data.html
            updateData.text_content = stripHtml(data.html) // Update plain text too
        }
        if (data.subject) updateData.subject = data.subject

        const { data: template, error } = await supabase
            .from('email_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return { template, error: null }
    } catch (error: any) {
        console.error('Error updating template:', error)
        return { template: null, error: error.message }
    }
}

export async function deleteTemplate(id: string) {
    try {
        const supabase = await createServerSupabaseClient()
        const { error } = await supabase
            .from('email_templates')
            .delete()
            .eq('id', id)

        if (error) throw error
        return { success: true, error: null }
    } catch (error: any) {
        console.error('Error deleting template:', error)
        return { success: false, error: error.message }
    }
}

// --- Automation Actions ---

export async function getAutomations() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data, error } = await supabase
            .from('email_automations')
            .select('*')
            .order('name', { ascending: true })

        if (error) throw error
        return { automations: data, error: null }
    } catch (error: any) {
        console.error('Error fetching automations:', error)
        return { automations: [], error: error.message }
    }
}

export async function toggleAutomationStatus(id: string, currentStatus: string) {
    try {
        const supabase = await createServerSupabaseClient()
        const newStatus = currentStatus === 'active' ? 'draft' : 'active'

        const { data, error } = await supabase
            .from('email_automations')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return { automation: data, error: null }
    } catch (error: any) {
        console.error('Error updating automation status:', error)
        return { automation: null, error: error.message }
    }
}

export async function createAutomation(data: { name: string, trigger_type: string, description?: string }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: automation, error } = await supabase
            .from('email_automations')
            .insert({
                name: data.name,
                trigger_type: data.trigger_type,
                description: data.description,
                status: 'draft',
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error
        return { automation, error: null }
    } catch (error: any) {
        console.error('Error creating automation:', error)
        return { automation: null, error: error.message }
    }
}

export async function getAutomation(id: string) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data, error } = await supabase
            .from('email_automations')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return { automation: data, error: null }
    } catch (error: any) {
        console.error('Error fetching automation:', error)
        return { automation: null, error: error.message }
    }
}

export async function saveAutomationGraph(id: string, graph: any) {
    try {
        const supabase = await createServerSupabaseClient()
        const { error } = await supabase
            .from('email_automations')
            .update({
                graph: graph,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
        return { success: true, error: null }
    } catch (error: any) {
        console.error('Error saving automation graph:', error)
        return { success: false, error: error.message }
    }
}

export async function getCampaigns() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data, error } = await supabase
            .from('email_campaigns')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return { campaigns: data, error: null }
    } catch (error: any) {
        console.error('Error fetching campaigns:', error)
        return { campaigns: [], error: error.message }
    }
}

export async function getTags() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data, error } = await supabase
            .from('tags')
            .select('id, name')
            .order('name', { ascending: true })

        if (error) throw error
        return { tags: data, error: null }
    } catch (error: any) {
        console.error('Error fetching tags:', error)
        return { tags: [], error: error.message }
    }
}
