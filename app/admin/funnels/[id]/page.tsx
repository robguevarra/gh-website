'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Pause, Settings, Save, Loader2, Beaker } from "lucide-react"
import { toast } from "sonner"

import { FunnelBuilder } from "../components/funnel-builder"
import { FunnelLogs } from "../components/funnel-logs"

export default function FunnelDetailPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createBrowserSupabaseClient()

    const [funnel, setFunnel] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState("overview")

    // Form State
    const [funnelName, setFunnelName] = useState("")
    const [conversionEvent, setConversionEvent] = useState("")
    const [simulationMode, setSimulationMode] = useState(false)

    useEffect(() => {
        if (params.id) {
            fetchFunnel(params.id as string)
        }
    }, [params.id])

    const fetchFunnel = async (id: string) => {
        setLoading(true)
        const { data, error } = await (supabase as any)
            .from('email_funnels')
            .select(`
                *,
                automation:email_automations(*),
                steps:email_funnel_steps(*)
            `)
            .eq('id', id)
            .single() as any

        if (data) {
            setFunnel(data)
            setFunnelName(data.name || "")
            setConversionEvent(data.conversion_goal_event || "")
            setSimulationMode(data.settings?.simulation_mode || false)
        }
        setLoading(false)
    }

    const toggleStatus = async () => {
        if (!funnel) return
        const newStatus = funnel.status === 'active' ? 'paused' : 'active'

        await (supabase as any).from('email_funnels').update({ status: newStatus }).eq('id', funnel.id)

        // Also update underlying automation status
        if (funnel.automation_id) {
            await (supabase as any).from('email_automations').update({ status: newStatus }).eq('id', funnel.automation_id)
        }

        setFunnel({ ...funnel, status: newStatus })
        toast.success(`Funnel ${newStatus === 'active' ? 'activated' : 'paused'}`)
    }

    const handleSaveSettings = async () => {
        if (!funnel) return
        setSaving(true)

        try {
            const updatedSettings = {
                ...funnel.settings,
                simulation_mode: simulationMode
            }

            const { error } = await (supabase as any)
                .from('email_funnels')
                .update({
                    name: funnelName,
                    conversion_goal_event: conversionEvent,
                    settings: updatedSettings,
                    updated_at: new Date().toISOString()
                })
                .eq('id', funnel.id)

            if (error) throw error

            toast.success("Funnel settings updated")

            // Update local funnel object to reflect changes
            setFunnel({ ...funnel, name: funnelName, conversion_goal_event: conversionEvent, settings: updatedSettings })

        } catch (e: any) {
            toast.error("Failed to update settings: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    const updateSimulationMode = async (enabled: boolean) => {
        setSimulationMode(enabled) // Optimistic update

        if (!funnel) return

        try {
            const updatedSettings = {
                ...funnel.settings,
                simulation_mode: enabled
            }

            const { error } = await (supabase as any)
                .from('email_funnels')
                .update({
                    settings: updatedSettings,
                    updated_at: new Date().toISOString()
                })
                .eq('id', funnel.id)

            if (error) throw error

            // Update local funnel object source of truth
            setFunnel({ ...funnel, settings: updatedSettings })
            toast.success(`Simulation Mode ${enabled ? 'Enabled' : 'Disabled'}`)

        } catch (e: any) {
            toast.error("Failed to save simulation mode: " + e.message)
            setSimulationMode(!enabled) // Revert on error
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading funnel details...</div>
    }

    if (!funnel) {
        return <div className="p-8 text-center text-red-500">Funnel not found.</div>
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <main className="flex-1 overflow-hidden flex flex-col h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
                {/* Header */}
                <div className="bg-card border-b px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/funnels')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold tracking-tight">{funnel.name}</h1>
                                <Badge variant={funnel.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                    {funnel.status}
                                </Badge>
                                {simulationMode && (
                                    <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
                                        <Beaker className="w-3 h-3 mr-1" />
                                        Simulation Mode
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                ROI: ₱0.00 • Active: 0
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={toggleStatus}>
                            {funnel.status === 'active' ? (
                                <><Pause className="mr-2 h-4 w-4" /> Pause Funnel</>
                            ) : (
                                <><Play className="mr-2 h-4 w-4" /> Activate Funnel</>
                            )}
                        </Button>
                        <Button onClick={handleSaveSettings} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Main Content Area (Tabs) */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="px-6 border-b bg-card">
                            <TabsList className="bg-transparent p-0">
                                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-3 pt-2">Overview</TabsTrigger>
                                <TabsTrigger value="builder" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-3 pt-2">Builder</TabsTrigger>
                                <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-3 pt-2">Settings</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative">
                            <TabsContent value="overview" className="h-full overflow-y-auto p-6 m-0">
                                <div className="max-w-4xl mx-auto space-y-8">
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                        {/* Quick Stats Placeholders */}
                                        <div className="p-4 border rounded-lg bg-card shadow-sm">
                                            <div className="text-sm font-medium text-muted-foreground">Total Entries</div>
                                            <div className="text-2xl font-bold">0</div>
                                        </div>
                                        <div className="p-4 border rounded-lg bg-card shadow-sm">
                                            <div className="text-sm font-medium text-muted-foreground">Active</div>
                                            <div className="text-2xl font-bold">0</div>
                                        </div>
                                        <div className="p-4 border rounded-lg bg-card shadow-sm">
                                            <div className="text-sm font-medium text-muted-foreground">Conversions</div>
                                            <div className="text-2xl font-bold">0</div>
                                        </div>
                                        <div className="p-4 border rounded-lg bg-card shadow-sm">
                                            <div className="text-sm font-medium text-muted-foreground">Revenue</div>
                                            <div className="text-2xl font-bold">₱0.00</div>
                                        </div>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Chart Placeholder */}
                                        <div className="p-6 border rounded-lg bg-card shadow-sm h-[400px] flex items-center justify-center text-muted-foreground">
                                            Chart Visualization Coming Soon
                                        </div>

                                        {/* Logs Viewer */}
                                        <div className="border rounded-lg bg-card shadow-sm p-4">
                                            <FunnelLogs automationId={funnel.automation_id} />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="builder" className="h-full m-0 relative">
                                {/* Embed Automation Builder */}
                                <div className="absolute inset-0">
                                    {funnel.automation_id ? (
                                        <div className="h-full w-full">
                                            <FunnelBuilder
                                                funnelId={funnel.id}
                                                automationId={funnel.automation_id}
                                                initialGraph={funnel.automation?.graph}
                                                steps={funnel.steps}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center">
                                                <p>No automation linked.</p>
                                                <Button variant="outline" className="mt-4">Init Automation</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="settings" className="h-full overflow-y-auto p-6 m-0">
                                <div className="max-w-2xl mx-auto space-y-8">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-lg font-medium">General Settings</h3>
                                            <p className="text-sm text-muted-foreground">Basic configuration for your funnel.</p>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Funnel Name</label>
                                            <input
                                                className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
                                                value={funnelName}
                                                onChange={(e) => setFunnelName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-lg font-medium">Attribution</h3>
                                            <p className="text-sm text-muted-foreground">Define what success looks like for this funnel.</p>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Conversion Goal Event</label>
                                            <input
                                                className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
                                                placeholder="checkout.completed"
                                                value={conversionEvent}
                                                onChange={(e) => setConversionEvent(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 border rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-500">Simulation Mode</h3>
                                                <p className="text-sm text-yellow-700/80 dark:text-yellow-500/80">
                                                    Run the funnel logic without sending real emails.
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={simulationMode}
                                                    onCheckedChange={updateSimulationMode}
                                                    className="data-[state=checked]:bg-yellow-600"
                                                />
                                                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-500">
                                                    {simulationMode ? 'On' : 'Off'}
                                                </span>
                                            </div>
                                        </div>
                                        {simulationMode && (
                                            <div className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded">
                                                <p><strong>Note:</strong> Executions will be processed normally (delays, checks), but emails will be logged instead of sent. Logs are visible in the database.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </main>
        </div>
    )
}
