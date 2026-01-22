'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, TrendingUp, Filter, Search, ArrowRight, Loader2, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteFunnel } from "../email-studio/actions"
import { toast } from "sonner"

import { CreateFunnelDialog } from "./components/create-funnel-dialog"

export default function FunnelsPage() {
    const router = useRouter()
    const supabase = createBrowserSupabaseClient()
    const [funnels, setFunnels] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchFunnels()
    }, [])

    const fetchFunnels = async () => {
        setLoading(true)
        const { data, error } = await (supabase as any)
            .from('email_funnels')
            .select(`
                *,
                steps:email_funnel_steps(metrics),
                journeys:email_funnel_journeys(count)
            `)
            .order('updated_at', { ascending: false })

        if (data) {
            // Calculate aggregate stats for the list view
            const processed = (data as any[]).map(funnel => {
                let totalRevenue = 0
                let totalEntered = 0
                let totalConverted = 0

                // Aggregate from steps
                funnel.steps?.forEach((step: any) => {
                    const metrics = step.metrics || {}
                    totalRevenue += Number(metrics.revenue || 0)
                    totalEntered = Math.max(totalEntered, Number(metrics.entered || 0))
                    totalConverted += Number(metrics.converted || 0)
                })

                return {
                    ...funnel,
                    stats: {
                        revenue: totalRevenue,
                        active_users: funnel.journeys?.[0]?.count || 0,
                        conversion_rate: totalEntered > 0 ? (totalConverted / totalEntered) * 100 : 0
                    }
                }
            })
            setFunnels(processed)
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        const result = await deleteFunnel(deleteId)
        if (result.success) {
            toast.success("Funnel deleted")
            fetchFunnels()
        } else {
            toast.error("Failed to delete funnel: " + result.error)
        }
        setIsDeleting(false)
        setDeleteId(null)
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            {/* Simple Sidebar Placeholder */}
            <div className="w-64 border-r bg-card p-6 hidden md:block">
                <div className="flex items-center gap-2 mb-8">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <h2 className="font-bold text-lg tracking-tight">Funnel Engine</h2>
                </div>
                <nav className="space-y-2">
                    <Button variant="secondary" className="w-full justify-start">
                        Dashboard
                    </Button>
                </nav>
            </div>

            <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Funnels</h1>
                            <p className="text-zinc-500 mt-1">Manage and optimize your customer journeys.</p>
                        </div>
                        <Button onClick={() => setIsCreateOpen(true)} size="lg" className="shadow-lg hover:shadow-xl transition-all bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Funnel
                        </Button>
                    </div>

                    {/* Stats Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₱0.00</div>
                                <p className="text-xs text-muted-foreground">+0% from last month</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active Journeys</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">Across all funnels</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Conversion</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0.0%</div>
                                <p className="text-xs text-muted-foreground">Global average</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters & Search */}
                    <div className="flex gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search funnels..." className="pl-9" />
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                        </Button>
                    </div>

                    {/* Funnels Table */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Funnel Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Active Users</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    <TableHead className="text-right">Conversion</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">Loading funnels...</TableCell>
                                    </TableRow>
                                ) : funnels.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No funnels found. Create your first one!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    funnels.map((funnel) => (
                                        <TableRow
                                            key={funnel.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                                            onClick={() => router.push(`/admin/funnels/${funnel.id}`)}
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="text-base">{funnel.name}</span>
                                                    <span className="text-xs text-muted-foreground">Updated {new Date(funnel.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={funnel.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                    {funnel.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{funnel.stats.active_users}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(funnel.stats.revenue)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={funnel.stats.conversion_rate > 0 ? "text-green-600 font-medium" : ""}>
                                                    {funnel.stats.conversion_rate.toFixed(1)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setDeleteId(funnel.id)
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>

            <CreateFunnelDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the funnel and all its associated data (steps, metrics, journeys). This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Funnel
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
