import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import * as postmarkModule from 'https://esm.sh/postmark'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const POSTMARK_SERVER_TOKEN = Deno.env.get('POSTMARK_SERVER_TOKEN') || ''
const POSTMARK_FROM_EMAIL = Deno.env.get('POSTMARK_FROM_EMAIL') || 'noreply@gracefulhomeschooling.com'
const POSTMARK_CLIENT = new postmarkModule.ServerClient(POSTMARK_SERVER_TOKEN)

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Authorization
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 2. Parse Payload
        const { execution_id } = await req.json()
        if (!execution_id) throw new Error('Missing execution_id')

        console.log(`[Walker] Processing execution: ${execution_id}`)

        // 3. Load Execution & Automation Graph
        const { data: execution, error: execError } = await supabase
            .from('automation_executions')
            .select(`
                id, 
                automation_id, 
                current_node_id, 
                context, 
                status,
                automation:email_automations (
                    id, 
                    graph
                )
            `)
            .eq('id', execution_id)
            .single()

        if (execError || !execution) {
            throw new Error(`Execution not found: ${execError?.message}`)
        }

        const { automation, current_node_id, context } = execution
        const graph = automation.graph // Expected: { nodes: [], edges: [] }
        const currentNode = graph.nodes.find((n: any) => n.id === current_node_id)

        if (!currentNode) {
            console.error(`[Walker] Node ${current_node_id} not found in graph. Completing execution.`)
            await supabase.from('automation_executions').update({ status: 'completed' }).eq('id', execution_id)
            return new Response(JSON.stringify({ status: 'completed', reason: 'node_not_found' }), { headers: corsHeaders })
        }

        console.log(`[Walker] Current Node: ${currentNode.id} (${currentNode.type})`)

        // 4. Step Idempotency Check
        const { data: stepLog } = await supabase
            .from('automation_logs')
            .select('status')
            .eq('execution_id', execution_id)
            .eq('node_id', current_node_id)
            .eq('status', 'success')
            .maybeSingle()

        if (stepLog) {
            console.log(`[Walker] Node ${current_node_id} already executed. Moving to next.`)
            await proceedToNextNode(supabase, execution, graph, currentNode, null)
            return new Response(JSON.stringify({ status: 'skipped_idempotent' }), { headers: corsHeaders })
        }

        // 4.5 [NEW] Premium Funnel Logic (Journey & Step Resolution)
        let funnelStepId: string | null = null
        try {
            // Find the funnel associated with this automation
            const { data: funnel } = await supabase.from('email_funnels').select('id').eq('automation_id', automation.id).maybeSingle()

            if (funnel) {
                // Find or Create the Step for this Node
                let { data: step } = await supabase.from('email_funnel_steps')
                    .select('id, metrics')
                    .eq('funnel_id', funnel.id)
                    .eq('node_id', current_node_id)
                    .maybeSingle()

                if (!step) {
                    console.log(`[Walker] Lazy-creating funnel step for node ${current_node_id}`)
                    // Create step
                    const { data: newStep, error: createError } = await supabase.from('email_funnel_steps').insert({
                        funnel_id: funnel.id,
                        node_id: current_node_id,
                        name: currentNode.data?.label || currentNode.id, // Fallback name
                        step_type: currentNode.type,
                        step_order: 0, // Todo: calculate order
                        template_id: currentNode.data?.templateId || null,
                        metrics: { entered: 0, completed: 0, converted: 0, revenue: 0 }
                    }).select('id, metrics').single()

                    if (!createError) {
                        step = newStep
                    }
                }

                if (step) {
                    funnelStepId = step.id

                    // Update User Journey
                    if (context?.contact_id) {
                        const { error: journeyError } = await supabase.from('email_funnel_journeys').upsert({
                            funnel_id: funnel.id,
                            contact_id: context.contact_id,
                            current_step_id: step.id,
                            status: 'active',
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'funnel_id, contact_id' })

                        // Increment 'entered' metric
                        const newMetrics = { ...step.metrics, entered: (step.metrics?.entered || 0) + 1 }
                        await supabase.from('email_funnel_steps').update({ metrics: newMetrics }).eq('id', step.id)

                        console.log(`[Walker] Updated Funnel Journey (Funnel: ${funnel.id}, Step: ${step.id})`)
                    }
                }
            }
        } catch (funnelError) {
            console.error(`[Walker] Funnel logic error:`, funnelError)
        }

        // 5. Execute Action (Logic Switch)
        let actionResult: any = null
        let actionStatus = 'success'
        let errorMessage = null

        try {
            // Log Start
            await supabase.from('automation_logs').insert({
                execution_id,
                node_id: current_node_id,
                action_type: currentNode.type,
                status: 'started',
                started_at: new Date().toISOString()
            })

            // Helper: Convert UI Time Units to Seconds
            function getDurationInSeconds(value: number, unit: string): number {
                if (!value) return 0
                switch (unit) {
                    case 'minutes': return value * 60
                    case 'hours': return value * 3600
                    case 'days': return value * 86400
                    default: return value // Default to seconds if unknown or 'seconds'
                }
            }

            // Normalize Node Type
            let effectiveType = currentNode.type
            if (effectiveType === 'funnelNode') {
                if (currentNode.data?.actionType === 'trigger') effectiveType = 'trigger'
                else effectiveType = 'action' // Treat all other funnel nodes as generic actions
            }

            switch (effectiveType) {
                case 'trigger':
                    // Trigger implies we just started. Nothing to "do" except move on.
                    break

                case 'action':
                case 'funnelNode': // Should be caught by normalization but safe to keep if fallthrough needed
                    const actionType = currentNode.data?.actionType
                    console.log(`[Walker] Executing Action: ${actionType}`)

                    if (actionType === 'email') { // Corrected from 'send_email' to match UI 'email'
                        const marketingOptIn = context?.marketing_opt_in

                        // Check Opt-in (unless transactional - todo logic)
                        if (marketingOptIn === false) {
                            console.log(`[Walker] User opted out. Skipping email.`)
                            actionResult = { skipped: true, reason: 'opt_out' }
                        } else {
                            const templateId = currentNode.data?.templateId
                            if (!templateId) {
                                throw new Error('Email Action missing templateId')
                            }

                            // Fetch Template
                            const { data: template, error: tmplError } = await supabase
                                .from('email_templates')
                                .select('subject, html_content')
                                .eq('id', templateId)
                                .single()

                            if (tmplError || !template) {
                                throw new Error(`Failed to fetch template ${templateId}: ${tmplError?.message}`)
                            }

                            // Logic: Subject Override
                            // If user defined a custom subject in the node, use it. Otherwise use template subject.
                            let subject = currentNode.data?.subject || template.subject || ''

                            // Prepare Substitution Data
                            const substitutionData = {
                                ...context, // contains email, first_name, etc. derived from event
                                first_name: context?.first_name || 'Friend',
                                company_name: 'Graceful Homeschooling',
                                current_year: new Date().getFullYear().toString(),
                                login_url: 'https://gracefulhomeschooling.com/auth/signin'
                            }

                            subject = substituteVariables(subject, substitutionData)
                            const htmlBody = substituteVariables(template.html_content || '', substitutionData)
                            const textBody = stripHtml(htmlBody)

                            if (context?.dry_run) {
                                console.log(`[Walker] DRY RUN: Mocking email send to ${context?.email}`)
                                console.log(`[Walker] Subject: ${subject}`)
                                actionResult = { email_sent: true, dry_run: true, messageId: 'mock-message-id' }
                            } else {
                                // Send via Postmark
                                console.log(`[Walker] Sending email to ${context?.email} via Postmark`)
                                const response = await POSTMARK_CLIENT.sendEmail({
                                    From: POSTMARK_FROM_EMAIL,
                                    To: context.email,
                                    Subject: subject,
                                    HtmlBody: htmlBody,
                                    TextBody: textBody,
                                    MessageStream: 'outbound',
                                    TrackOpens: true,
                                    TrackLinks: "HtmlAndText",
                                    Metadata: {
                                        automation_id: automation.id,
                                        execution_id: execution.id,
                                        node_id: current_node_id,
                                        funnel_step_id: funnelStepId // Injected ID
                                    }
                                })

                                console.log(`[Walker] Email sent! MessageID: ${response.MessageID}`)
                                actionResult = { email_sent: true, messageId: response.MessageID }
                            }
                        }
                    } else if (actionType === 'tag') { // Corrected from 'tag_user' to match UI 'tag'
                        // Logic to tag user
                        // We need the user ID. 'context.contact_id'.
                        const userId = context?.contact_id
                        // PROBLEM: UI Sends `tagName` (string), we need `tagId` (UUID).
                        // Solution: Try to find tag by name if UUID is invalid or missing.
                        let tagId = currentNode.data?.tagId
                        const tagName = currentNode.data?.tagName

                        if (!tagId && tagName) {
                            // Lookup tag ID by name
                            const { data: tagData } = await supabase.from('tags').select('id').eq('name', tagName).single()
                            if (tagData) tagId = tagData.id
                        }

                        if (userId && tagId) {
                            if (context?.dry_run) {
                                console.log(`[Walker] DRY RUN: tagging user ${userId} with ${tagId}`)
                                actionResult = { tag_added: true, dry_run: true }
                            } else {
                                // Check if user already has tag? upsert ignores conflict.
                                const { error: tagError } = await supabase.from('user_tags').insert({
                                    user_id: userId,
                                    tag_id: tagId,
                                    assigned_at: new Date().toISOString()
                                }).ignore() // Ignore duplicates (requires constraint)

                                // Fallback if ignore() not supported by client types: use upsert
                                if (tagError && tagError.code !== '23505') { // 23505 is unique violation
                                    // Actually just usage of upsert on conflict
                                    await supabase.from('user_tags').upsert({ user_id: userId, tag_id: tagId }, { onConflict: 'user_id, tag_id' })
                                }

                                actionResult = { tag_added: true, tag_id: tagId }
                            }
                        } else {
                            console.warn(`[Walker] Skipped Tag Action: Missing userId (${userId}) or tagId/Name (${tagId}/${tagName})`)
                            actionResult = { skipped: true, reason: 'missing_params' }
                        }
                    } else if (actionType === 'delay' || actionType === 'wait_event') {
                        // Fallback handling if these are action types
                        const delayValue = currentNode.data?.delayValue || 0
                        const delayUnit = currentNode.data?.delayUnit || 'seconds'
                        const seconds = getDurationInSeconds(delayValue, delayUnit)

                        const wakeUpTime = new Date(Date.now() + seconds * 1000)

                        console.log(`[Walker] Pausing for ${seconds}s (${delayValue} ${delayUnit}) until ${wakeUpTime.toISOString()}`)

                        await supabase.from('automation_executions').update({
                            status: 'paused',
                            wake_up_time: wakeUpTime.toISOString()
                        }).eq('id', execution_id)

                        await logCompletion(supabase, execution_id, current_node_id, 'success', { paused_until: wakeUpTime, type: actionType })
                        return new Response(JSON.stringify({ status: 'paused' }), { headers: corsHeaders })
                    }
                    break

                case 'delay': // Separate Node Type (if used)
                case 'wait_event': // Separate Node Type (Wait Until)
                    // Note: 'Wait Until' (wait_event) is currently implemented as a TIMEOUT wait.
                    // Meaning it pauses for the specified time.
                    // *Ideally*, the Watcher would wake this up EARLY if the event happens.
                    // But for now, we just enforce the wait.
                    const delayValue = currentNode.data?.delayValue || 0
                    const delayUnit = currentNode.data?.delayUnit || 'seconds'
                    const seconds = getDurationInSeconds(delayValue, delayUnit)

                    const wakeUpTime = new Date(Date.now() + seconds * 1000)

                    console.log(`[Walker] Pausing for ${seconds}s (${delayValue} ${delayUnit}) until ${wakeUpTime.toISOString()}`)

                    await supabase.from('automation_executions').update({
                        status: 'paused',
                        wake_up_time: wakeUpTime.toISOString()
                    }).eq('id', execution_id)

                    await logCompletion(supabase, execution_id, current_node_id, 'success', { paused_until: wakeUpTime })
                    return new Response(JSON.stringify({ status: 'paused' }), { headers: corsHeaders })

                case 'condition':
                    // Condition Logic
                    const field = currentNode.data?.field
                    const operator = currentNode.data?.operator
                    const checkValue = currentNode.data?.checkValue

                    let outcome = false
                    console.log(`[Walker] Evaluating Condition: ${field} ${operator} ${checkValue}`)

                    if (field === 'tags') {
                        // Check if user has tag (checkValue is tag name)
                        const userId = context?.contact_id
                        if (userId) {
                            // Get tag ID first
                            const { data: tagData } = await supabase.from('tags').select('id').eq('name', checkValue).single()
                            if (tagData) {
                                const { data: hasTag } = await supabase.from('user_tags').select('tag_id').eq('user_id', userId).eq('tag_id', tagData.id).maybeSingle()
                                if (operator === 'contains') outcome = !!hasTag
                                else if (operator === 'equals') outcome = !!hasTag // Same for tags
                            }
                        }
                    } else if (field === 'order_count') {
                        // Mock implementation, requires fetching profile stats
                        outcome = false // Default
                    }

                    console.log(`[Walker] Condition Result: ${outcome}`)
                    actionResult = { outcome: outcome }
                    break

                default:
                    console.warn(`[Walker] Unknown node type: ${currentNode.type}`)
            }

            // Log Completion
            await logCompletion(supabase, execution_id, current_node_id, 'success', actionResult)

        } catch (err: any) {
            console.error(`[Walker] Action Failed:`, err)
            actionStatus = 'failure'
            errorMessage = err.message

            await logCompletion(supabase, execution_id, current_node_id, 'failure', { error: errorMessage })

            // Mark execution as failed or schedule retry
            await supabase.from('automation_executions').update({
                status: 'failed',
                last_error: errorMessage
            }).eq('id', execution.id)

            return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: corsHeaders })
        }

        // 6. Proceed to Next Node
        await proceedToNextNode(supabase, execution, graph, currentNode, actionResult)

        return new Response(JSON.stringify({ status: 'proceeding' }), { headers: corsHeaders })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }
})


// Helper: Log Completion
async function logCompletion(supabase: any, executionId: string, nodeId: string, status: string, metadata: any) {
    await supabase.from('automation_logs').update({
        status,
        completed_at: new Date().toISOString(),
        metadata
    })
        .eq('execution_id', executionId)
        .eq('node_id', nodeId)
}

// Helper: Find and Traverse to Next Node
async function proceedToNextNode(supabase: any, execution: any, graph: any, currentNode: any, actionResult: any) {
    // Find outgoing edge
    // Filter edges where source == currentNode.id
    const edges = graph.edges.filter((e: any) => e.source === currentNode.id)

    let nextNodeId = null

    if (currentNode.type === 'condition') {
        const outcome = actionResult?.outcome ? 'true' : 'false'
        // FIX: The edge sourceHandle should be 'true' or 'false' (string)
        // In the builder, we need to ensure the handles are named 'true' and 'false'.
        // Assuming the Condition Node has distinct handles.
        // If not, we rely on the edge 'label' or 'sourceHandle'. 
        // Let's assume sourceHandle matches the outcome boolean-string.
        const edge = edges.find((e: any) => e.sourceHandle === outcome || e.label === outcome)
        nextNodeId = edge?.target

        if (!nextNodeId && edges.length > 0) {
            // Fallback: If no specific handle match, maybe just take the first one?
            // Or log warning
            console.warn(`[Walker] No edge found for condition outcome: ${outcome}`)
        }
    } else {
        // Linear flow, take first edge
        nextNodeId = edges[0]?.target
    }

    if (nextNodeId) {
        console.log(`[Walker] Moving to next node: ${nextNodeId}`)

        // Update Execution
        await supabase.from('automation_executions').update({
            current_node_id: nextNodeId,
            status: 'active', // Ensure active if it was paused
            wake_up_time: null
        }).eq('id', execution.id)

        // Recursive Call (Invoke Walker for next step)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Fire and Forget (don't await response to avoid stack depth issues or long waits)
        fetch(`${supabaseUrl}/functions/v1/process-automation-step`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ execution_id: execution.id })
        }).catch(err => console.error(`[Walker] Failed to recurse:`, err))

    } else {
        console.log(`[Walker] End of flow. Completing execution.`)
        await supabase.from('automation_executions').update({
            status: 'completed',
            completed_at: new Date().toISOString()
        }).eq('id', execution.id)
    }
}

// Helper: Strip HTML
function stripHtml(html: string) {
    return html.replace(/<[^>]*>?/gm, "")
}

// Helper: Variable Substitution
function substituteVariables(content: string, vars: Record<string, any>): string {
    return content.replace(/{{([\w.]+)}}/g, (match, key) => {
        const keys = key.split('.')
        let value = vars
        for (const k of keys) {
            value = value?.[k]
        }
        return value !== undefined && value !== null ? String(value) : match
    })
}

