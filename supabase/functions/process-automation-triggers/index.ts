
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Authorization
        // We expect a Service Role key or internal call
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 2. Parse Payload
        const { event_id, type, email, contact_id, metadata, marketingOptIn } = await req.json()

        console.log(`[Watcher] Received event: ${type}, Email: ${email}, EventID: ${event_id}`)

        if (!event_id || !type || !email) {
            throw new Error('Missing required fields: event_id, type, email')
        }

        // 3a. Resume Paused Executions (Wait Until Logic)
        // Check if any executions are PAUSED and waiting for this event (implicit match by contact_id/metadata)
        // Note: For 'Wait Until', we need to check if the current node is a 'wait_event' type 
        // AND if the event metadata matches what the node is waiting for.

        // This query finds paused executions for this user.
        // We will then check their graph/node logic.
        // 3. [NEW] Premium Funnel Attribution (Revenue Tracking)
        // If this is a conversion event (e.g. checkout.completed), we check if the user is in an active funnel journey.
        if (contact_id && type === 'checkout.completed') {
            console.log(`[Watcher] Checking funnel attribution for checkout.completed event (User: ${contact_id})`)

            // Find active journeys for this user
            const { data: activeJourneys } = await supabase
                .from('email_funnel_journeys')
                .select(`
                    id, 
                    funnel_id, 
                    current_step_id, 
                    started_at,
                    funnel:email_funnels (
                        conversion_goal_event,
                        settings
                    )
                `)
                .eq('contact_id', contact_id)
                .eq('status', 'active')

            if (activeJourneys && activeJourneys.length > 0) {
                console.log(`[Watcher] Found ${activeJourneys.length} active journeys. processing attribution...`)
                const amount = metadata?.amount || 0
                const transactionId = metadata?.transaction_id

                for (const journey of activeJourneys) {
                    // Check attribution window logic if needed (e.g. settings.attribution_window_days)
                    // For now, simple direct attribution

                    // 1. Record Conversion
                    await supabase.from('email_funnel_conversions').insert({
                        funnel_id: journey.funnel_id,
                        contact_id: contact_id,
                        transaction_id: transactionId,
                        amount: amount,
                        attributed_step_id: journey.current_step_id
                    })

                    // 2. Mark Journey as Converted (revenue_generated)
                    // We don't necessarily close the journey (they might still get emails), 
                    // but we update the revenue stats.
                    // Or maybe we mark status='converted'? Let's keep 'active' but update revenue so they stay in flow.
                    await supabase.from('email_funnel_journeys').update({
                        revenue_generated: amount, // Accumulate? For now just set.
                        // status: 'converted' // If we want to stop the flow? valid debate. keeping active for upsells.
                    }).eq('id', journey.id)

                    // 3. Increment Step Metrics
                    // We need to fetch current metrics first or use an RPC. 
                    // For simplicity, we'll try a raw RPC or just read/write (less safe but MVP).
                    if (journey.current_step_id) {
                        const { data: step } = await supabase.from('email_funnel_steps').select('metrics').eq('id', journey.current_step_id).single()
                        if (step) {
                            const newMetrics = {
                                ...step.metrics,
                                revenue: (step.metrics?.revenue || 0) + Number(amount),
                                converted: (step.metrics?.converted || 0) + 1
                            }
                            await supabase.from('email_funnel_steps').update({ metrics: newMetrics }).eq('id', journey.current_step_id)
                        }
                    }

                    console.log(`[Watcher] Attributed ${amount} revenue to Funnel ${journey.funnel_id} (Step ${journey.current_step_id})`)

                    // 4. [CRITICAL] Stop the Funnel Execution (Prevent Spam)
                    // If the user converted, we MUST stop the abandonment emails.
                    // We update the journey status to 'converted' and the automation execution to 'completed'.

                    // A. Update Journey Status
                    await supabase.from('email_funnel_journeys').update({
                        revenue_generated: amount,
                        status: 'converted', // Stop the journey
                        completed_at: new Date().toISOString()
                    }).eq('id', journey.id)

                    // B. Stop Automation Execution
                    // We need to find the specific execution linked to this funnel/automation for this user.
                    if (journey.funnel && journey.funnel.settings) {
                        // The journey query joined `funnel:email_funnels (...)`.
                        // But strictly, we need the automation_id from the funnel.
                        // Let's assume we can fetch it or we already have it contextually? 
                        // Actually, better to query executions by user + automation_id.
                        // We need the automation_id. Let's fetch it if not in join.
                        const { data: funnelData } = await supabase.from('email_funnels').select('automation_id').eq('id', journey.funnel_id).single()

                        if (funnelData && funnelData.automation_id) {
                            const { data: activeExec } = await supabase.from('automation_executions')
                                .select('id')
                                .eq('automation_id', funnelData.automation_id)
                                .eq('contact_id', contact_id)
                                .in('status', ['active', 'paused']) // Stop active or paused
                                .maybeSingle()

                            if (activeExec) {
                                console.log(`[Watcher] Stopping execution ${activeExec.id} due to conversion.`)
                                await supabase.from('automation_executions').update({
                                    status: 'completed', // Or 'cancelled' - 'completed' is cleaner regarding success.
                                    completed_at: new Date().toISOString(),
                                    last_error: 'Stopped by Conversion Goal'
                                }).eq('id', activeExec.id)
                            }
                        }
                    }
                }
            }
        }

        // 3a. Resume Paused Executions (Wait Until Logic)
        if (contact_id) {
            const { data: pausedExecutions, error: pausedError } = await supabase
                .from('automation_executions')
                .select(`
                    id, 
                    created_at,
                    automation_id, 
                    current_node_id, 
                    context, 
                    automation:email_automations (id, graph)
                `)
                .eq('status', 'paused')
                .eq('contact_id', contact_id)

            if (!pausedError && pausedExecutions && pausedExecutions.length > 0) {
                console.log(`[Watcher] Found ${pausedExecutions.length} paused executions for this user. Checking for resume match...`)

                for (const exec of pausedExecutions) {
                    const graph = exec.automation.graph
                    const currentNode = graph.nodes.find((n: any) => n.id === exec.current_node_id)

                    if (currentNode && currentNode.type === 'wait_event') {
                        // Check if event type matches
                        const waitingForEvent = currentNode.data?.event
                        // If the node is configured to wait for THIS incoming event type
                        if (waitingForEvent === type) {

                            // Optional: Add specific filter checks here (e.g. wait for 'email_clicked' on specific CampaignID)
                            // For now, implicit matching (same user, correct event type) is our MVP.
                            // If we wanted to be strict: 
                            // if (type === 'email_clicked' && currentNode.data.filterCampaign !== metadata.campaign_id) continue;

                            console.log(`[Watcher] Resuming Execution ${exec.id} (Matched Event: ${type})`)

                            // Update Status to Active
                            await supabase.from('automation_executions').update({
                                status: 'active',
                                wake_up_time: null, // Clear the timeout
                                last_error: null
                            }).eq('id', exec.id)

                            // Invoke Walker immediately
                            try {
                                await fetch(`${supabaseUrl}/functions/v1/process-automation-step`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${supabaseServiceKey}`
                                    },
                                    body: JSON.stringify({ execution_id: exec.id })
                                })
                            } catch (invokeError) {
                                console.error(`[Watcher] Failed to resume Walker for ${exec.id}:`, invokeError)
                            }
                        }
                    }
                }
            }
        }

        // 3. Find Matching Automations (New Starts)
        // Query active automations with this trigger type
        const { data: automations, error: autoError } = await supabase
            .from('email_automations')
            .select('id, name, graph, email_funnels(settings)')
            .eq('trigger_type', type)
            .eq('status', 'active')

        if (autoError) throw autoError

        console.log(`[Watcher] Found ${automations?.length || 0} matching automations for type: ${type}`)

        if (!automations || automations.length === 0) {
            return new Response(JSON.stringify({ message: 'No automations triggered', count: 0 }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 4. Create Executions (with Idempotency)
        const executions = []

        for (const automation of automations) {
            // 4a. Filter Check
            // We check if the automation has specific filters in its start node configuration
            const startNode = automation.graph.nodes.find((n: any) => n.type === 'trigger')
            if (!startNode) {
                console.warn(`[Watcher] Automation ${automation.id} has no trigger node. Skipping.`)
                continue
            }

            // Logic: If Trigger Node has `filterProductType` AND it's not 'any',
            // we must match it against `metadata.product_type`.
            const filterProductType = startNode.data?.filterProductType
            if (filterProductType && filterProductType !== 'any') {
                const eventProductType = metadata?.product_type
                if (eventProductType !== filterProductType) {
                    console.log(`[Watcher] Automation ${automation.id} skipped. Product Filter mismatch: ${eventProductType} != ${filterProductType}`)
                    continue
                }
            }

            // Logic: If Trigger Node has `filterTag` AND it's not 'any' or empty,
            // we must match it against `metadata.tag_name`.
            const filterTag = startNode.data?.filterTag
            if (filterTag && filterTag !== 'any' && filterTag !== '') {
                const eventTagName = metadata?.tag_name
                if (eventTagName !== filterTag) {
                    console.log(`[Watcher] Automation ${automation.id} skipped. Tag Filter mismatch: ${eventTagName} != ${filterTag}`)
                    continue
                }
            }

            // Logic: If Trigger Node has `filterCampaign` AND it's not 'any' or empty,
            // we must match it against `metadata.campaign_id`.
            const filterCampaign = startNode.data?.filterCampaign
            if (filterCampaign && filterCampaign !== 'any' && filterCampaign !== '') {
                const eventCampaignId = metadata?.campaign_id
                if (eventCampaignId !== filterCampaign) {
                    console.log(`[Watcher] Automation ${automation.id} skipped. Campaign Filter mismatch: ${eventCampaignId} != ${filterCampaign}`)
                    continue
                }
            }

            // 4b. Identify Start Node - ALREADY FOUND ABOVE
            // Checking if startNode exists again is redundant but we should keep the check logic if needed?
            // Actually, we already continued if !startNode above. So we are safe.


            // 4c. Create Execution Record
            // Idempotency: unique_event_id = `${event_id}_${automation.id}`
            const uniqueEventId = `${event_id}_${automation.id}`

            // Check if exists
            const { data: existing } = await supabase
                .from('automation_executions')
                .select('id')
                .eq('unique_event_id', uniqueEventId)
                .maybeSingle()

            if (existing) {
                console.log(`[Watcher] Execution already exists for event ${uniqueEventId}. Skipping.`)
                continue
            }

            const context = {
                email,
                contact_id,
                ...metadata,
                trigger_event: type,
                marketing_opt_in: marketingOptIn,
                dry_run: automation.email_funnels?.[0]?.settings?.simulation_mode || false
            }

            const { data: newExecution, error: insertError } = await supabase
                .from('automation_executions')
                .insert({
                    automation_id: automation.id,
                    contact_id: contact_id || null, // Might be null if just a visitor email
                    current_node_id: startNode.id,
                    status: 'active',
                    context: context,
                    unique_event_id: uniqueEventId,
                    retry_count: 0
                })
                .select('id')
                .single()

            if (insertError) {
                console.error(`[Watcher] Failed to create execution for automation ${automation.id}:`, insertError)
                continue
            }

            console.log(`[Watcher] Created execution ${newExecution.id} for automation ${automation.id}`)
            executions.push(newExecution.id)

            // 5. Invoke The Walker (Fire and Forget or Await?)
            // We await it to ensure we don't kill the function too early, 
            // but failures in Walker shouldn't fail the Trigger process ideally.
            // We'll catch errors.
            try {
                await fetch(`${supabaseUrl}/functions/v1/process-automation-step`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseServiceKey}`
                    },
                    body: JSON.stringify({ execution_id: newExecution.id })
                })
            } catch (invokeError) {
                console.error(`[Watcher] Failed to invoke Walker for ${newExecution.id}:`, invokeError)
            }
        }

        return new Response(JSON.stringify({
            message: 'Triggers processed',
            executions_created: executions.length,
            execution_ids: executions
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[Watcher] Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
