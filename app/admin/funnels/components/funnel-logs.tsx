'use client'

import { useState, useEffect } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FunnelLogsProps {
    automationId: string
}

export function FunnelLogs({ automationId }: FunnelLogsProps) {
    const supabase = createBrowserSupabaseClient()
    const [executions, setExecutions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [nodeLabels, setNodeLabels] = useState<Record<string, string>>({})

    const fetchLogs = async () => {
        setLoading(true)

        // 1. Fetch Logs & Context
        const { data: execData } = await supabase
            .from('automation_executions')
            .select(`
                id, created_at, status, contact_id, current_node_id, context,
                logs:automation_logs(
                    id, node_id, action_type, status, metadata, created_at, completed_at
                )
            `)
            .eq('automation_id', automationId)
            .order('created_at', { ascending: false })
            .limit(50)

        // 2. Fetch Graph for Node Labels
        const { data: autoData } = await supabase
            .from('email_automations')
            .select('graph')
            .eq('id', automationId)
            .single()

        if (autoData?.graph?.nodes) {
            const mapping: Record<string, string> = {}
            autoData.graph.nodes.forEach((n: any) => {
                mapping[n.id] = n.data?.label || n.data?.name || 'Unknown Node'
            })
            setNodeLabels(mapping)
        }

        if (execData) {
            setExecutions(execData)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (automationId) {
            fetchLogs()
        }
    }, [automationId])

    // Helper to get friendly action name
    const getFriendlyActionType = (log: any) => {
        if (log.action_type === 'funnelNode') {
            // Try to infer from metadata or node label logic if we had access to the node type here.
            // But simplisticly, if it's 'funnelNode', check metadata keys
            if (log.metadata?.email_sent) return 'EMAIL'
            if (log.metadata?.paused_until) return 'DELAY'
            if (log.metadata?.tag_added) return 'TAG'
            return 'STEP'
        }
        return log.action_type || 'ACTION'
    }

    if (loading) return <div className="text-center p-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading logs...</div>

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Recent Executions</h3>
                <Button variant="ghost" size="sm" onClick={fetchLogs}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
            </div>

            <ScrollArea className="h-[400px] border rounded-md p-4 bg-muted/20">
                {executions.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        No executions found yet.
                        <br />
                        <span className="text-xs opacity-70">Trigger the funnel (checkout start) to see logs here.</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {executions.map((exec) => (
                            <div key={exec.id} className="text-sm border-b border-border/50 pb-3 last:border-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={
                                            exec.status === 'completed' ? 'default' :
                                                exec.status === 'active' ? 'secondary' :
                                                    exec.status === 'failed' ? 'destructive' :
                                                        'outline'
                                        } className="text-[10px] h-5 px-1.5 capitalize">
                                            {exec.status}
                                        </Badge>
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {new Date(exec.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    {exec.context?.dry_run && (
                                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-yellow-500/50 text-yellow-600">
                                            DRY RUN
                                        </Badge>
                                    )}
                                </div>
                                <div className="pl-1">
                                    <div className="text-xs font-medium truncate">
                                        User: <span className="text-muted-foreground font-normal">{exec.context?.email || 'Unknown'}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[500px]">
                                        Current Node: <span className="font-semibold text-foreground">{nodeLabels[exec.current_node_id] || exec.current_node_id}</span>
                                    </div>

                                    {/* Real Backend Logs */}
                                    <div className="mt-2 space-y-1">
                                        {exec.logs && exec.logs.length > 0 ? (
                                            exec.logs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((log: any) => (
                                                <div key={log.id} className="text-[10px] font-mono bg-black/5 dark:bg-white/5 p-1.5 rounded flex flex-col gap-0.5">
                                                    <div className="flex justify-between op-70">
                                                        <div className="flex gap-2">
                                                            <span className="uppercase font-bold text-[9px]">{getFriendlyActionType(log)}</span>
                                                            {/* Show Node Name in log too if differs from current */}
                                                            {log.node_id !== exec.current_node_id && (
                                                                <span className="opacity-50 text-[9px]">({nodeLabels[log.node_id] || 'Step'})</span>
                                                            )}
                                                        </div>
                                                        <span className={
                                                            log.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                                                                log.status === 'failure' ? 'text-red-600 dark:text-red-400' : ''
                                                        }>{log.status}</span>
                                                    </div>
                                                    <div>
                                                        {log.metadata?.dry_run ? <span className="text-yellow-600 mr-1">[Mock]</span> : ''}

                                                        {/* Smart Message Display */}
                                                        {(log.metadata?.email_sent || log.metadata?.type === 'email') ?
                                                            `Email Sent (MsgID: ${log.metadata.messageId || 'N/A'})` :
                                                            (log.metadata?.paused_until || log.metadata?.type === 'delay') ?
                                                                `Paused until ${new Date(log.metadata.paused_until).toLocaleTimeString()}` :
                                                                (log.metadata?.tag_added || log.metadata?.type === 'tag') ?
                                                                    `Tag Added: ${log.metadata?.tag_id}` :
                                                                    log.metadata?.error ?
                                                                        <span className="text-red-500">Error: {log.metadata.error}</span> :

                                                                        /* Fallback for generic success */
                                                                        (log.status === 'success' && !log.metadata?.email_sent && !log.metadata?.paused_until) ?
                                                                            <span className="opacity-50">Completed</span> :

                                                                            JSON.stringify(log.metadata)
                                                        }
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-[10px] text-muted-foreground italic">No logs yet...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
