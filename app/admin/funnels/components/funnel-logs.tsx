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

    const fetchLogs = async () => {
        setLoading(true)
        // Fetch executions for this automation, ordered by recent first
        const { data, error } = await supabase
            .from('automation_executions')
            .select(`
                id,
                created_at,
                status,
                contact_id,
                current_node_id,
                context
            `)
            .eq('automation_id', automationId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (data) {
            setExecutions(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (automationId) {
            fetchLogs()
        }
    }, [automationId])

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
                                        Node: {exec.current_node_id}
                                    </div>
                                    {/* Mock Logs display - implying action taken */}
                                    {exec.status === 'active' && exec.context?.dry_run && (
                                        <div className="mt-1.5 text-[10px] font-mono bg-black/5 dark:bg-white/5 p-1.5 rounded">
                                            {`[Simulation] Processing Node: ${exec.current_node_id}`}
                                            <br />
                                            {`[Simulation] Email would be sent to ${exec.context?.email}`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
