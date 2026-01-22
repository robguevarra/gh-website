'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Pause, Settings, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { FunnelBuilder } from "../components/funnel-builder"

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
            const { error } = await (supabase as any)
                .from('email_funnels')
                .update({
                    name: funnelName,
                    conversion_goal_event: conversionEvent,
                    updated_at: new Date().toISOString()
                })
                .eq('id', funnel.id)

            if (error) throw error

            toast.success("Funnel settings updated")

            // Update local funnel object to reflect changes
            setFunnel({ ...funnel, name: funnelName, conversion_goal_event: conversionEvent })

        } catch (e: any) {
            toast.error("Failed to update settings: " + e.message)
        } finally {
            setSaving(false)
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
                                {/* Dashboard Component Placeholder */}
                                <div className="max-w-4xl mx-auto text-center py-12">
                                    <h3 className="text-lg font-medium text-muted-foreground">Analytics Dashboard</h3>
                                    <p className="text-sm text-muted-foreground">Charts and insights coming soon.</p>
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
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-medium">General Settings</h3>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Funnel Name</label>
                                            <input
                                                className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
                                                value={funnelName}
                                                onChange={(e) => setFunnelName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-medium">Attribution</h3>
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
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </main>
        </div>
    )
}
