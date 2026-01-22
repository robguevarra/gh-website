'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaignStore } from '@/lib/hooks/use-campaign-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, Edit, FileText, Mail, MousePointer, Send, Copy, AlertCircle, Loader2 } from 'lucide-react'
import { duplicateCampaign } from '../../wizard/actions'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface CampaignStatsProps {
    campaignId: string
    onBack?: () => void
    onEdit?: () => void
    onDuplicate?: (newId: string) => void
}

export function CampaignStats({ campaignId, onBack, onEdit, onDuplicate }: CampaignStatsProps) {
    const router = useRouter()
    const { toast } = useToast()
    const {
        currentCampaign,
        currentCampaignLoading,
        currentCampaignError,
        fetchCampaign,
        campaignAnalytics,
        fetchCampaignAnalytics
    } = useCampaignStore()

    const [isRetrying, setIsRetrying] = useState(false)
    const [isDuplicating, setIsDuplicating] = useState(false)

    useEffect(() => {
        if (campaignId) {
            fetchCampaign(campaignId)
            fetchCampaignAnalytics(campaignId)
        }
    }, [campaignId, fetchCampaign, fetchCampaignAnalytics])

    const handleDuplicate = async () => {
        setIsDuplicating(true)
        try {
            const newId = await duplicateCampaign(campaignId)
            toast({
                title: "Campaign Duplicated",
                description: "Redirecting to wizard...",
            })
            if (onDuplicate) {
                onDuplicate(newId)
            } else {
                router.push(`/admin/email/wizard?id=${newId}`)
            }
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to duplicate campaign",
                variant: "destructive"
            })
            setIsDuplicating(false)
        }
    }

    const { retryFailedJobs } = useCampaignStore()

    const handleRetry = async () => {
        setIsRetrying(true)
        try {
            const result = await retryFailedJobs(campaignId)
            if (result.retried > 0) {
                toast({
                    title: "Retrying Failed Jobs",
                    description: `Queued ${result.retried} failed jobs for retry.`,
                })
            } else {
                toast({
                    title: "No Failed Jobs",
                    description: "No jobs with 'failed' status were found.",
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to retry jobs",
                variant: "destructive"
            })
        } finally {
            setIsRetrying(false)
        }
    }

    const handleEdit = () => {
        if (onEdit) {
            onEdit()
        } else {
            router.push(`/admin/email/wizard?id=${campaignId}`)
        }
    }

    if (currentCampaignLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (currentCampaignError || !currentCampaign) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p>Failed to load campaign</p>
                <Button onClick={() => router.push('/admin/email/campaigns')}>Back to Campaigns</Button>
            </div>
        )
    }

    const isDraft = currentCampaign.status === 'draft'
    const isSent = currentCampaign.status === 'sent' || currentCampaign.status === 'completed' || currentCampaign.status === 'sending'
    const isScheduled = currentCampaign.status === 'scheduled'

    // Calculate rates
    const recipientCount = campaignAnalytics?.total_recipients || 0
    const openCount = campaignAnalytics?.total_opens || 0
    const clickCount = campaignAnalytics?.total_clicks || 0

    // Safely calculate percentages
    const openRate = campaignAnalytics?.open_rate ? Math.round(campaignAnalytics.open_rate) : 0
    const clickRate = campaignAnalytics?.click_rate ? Math.round(campaignAnalytics.click_rate) : 0

    return (
        <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50 pb-20">
            {/* Header / Nav */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => onBack ? onBack() : router.push('/admin/email-studio')} className="-ml-3 rounded-full h-8 w-8 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg font-semibold tracking-tight text-foreground">{currentCampaign.name}</h1>
                                <Badge variant="outline" className={cn(
                                    "capitalize font-normal px-2 py-0.5 text-xs rounded-full bg-transparent",
                                    isSent && "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
                                    isDraft && "text-zinc-500 border-zinc-200 bg-zinc-50 dark:text-zinc-400",
                                    isScheduled && "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                                )}>
                                    {currentCampaign.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {isSent ? 'Sent on ' : 'Created on '}
                                    {new Date(currentCampaign.scheduled_at || currentCampaign.created_at).toLocaleDateString(undefined, {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Actions based on Status */}
                        {(isDraft || isScheduled) && (
                            <Button onClick={handleEdit} className={cn("gap-2", isDraft ? "bg-zinc-900 text-white hover:bg-zinc-800" : "")}>
                                <Edit className="h-4 w-4" />
                                {isDraft ? 'Continue Editing' : 'Edit Configuration'}
                            </Button>
                        )}

                        {isSent && (
                            <>
                                <Button onClick={handleRetry} disabled={isRetrying} variant="outline" className="gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-500">
                                    {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                                    Retry Failed
                                </Button>
                                <Button onClick={handleDuplicate} disabled={isDuplicating} className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm">
                                    {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                                    Duplicate & Resend
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* Stats Overview */}
                {isSent && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">100% Sent</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold tracking-tight">{recipientCount.toLocaleString()}</div>
                                    <p className="text-sm text-muted-foreground mt-1 font-medium">Total Recipients</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                        <MousePointer className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold tracking-tight">{openRate}%</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-sm text-muted-foreground font-medium">Open Rate</p>
                                        <span className="text-xs text-zinc-400">({openCount.toLocaleString()} opens)</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                        <MousePointer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold tracking-tight">{clickRate}%</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-sm text-muted-foreground font-medium">Click Rate</p>
                                        <span className="text-xs text-zinc-400">({clickCount.toLocaleString()} clicks)</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold tracking-tight">0%</div>
                                    <p className="text-sm text-muted-foreground mt-1 font-medium">Bounces</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Preview */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden">
                            <div className="px-6 py-4 border-b flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-sm">Email Preview</h3>
                                </div>
                                <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-1 hidden sm:flex">
                                    <div className="px-3 py-1 bg-white dark:bg-zinc-700 shadow-sm rounded-md text-xs font-medium cursor-default">Desktop</div>
                                    <div className="px-3 py-1 text-zinc-500 text-xs font-medium cursor-not-allowed">Mobile</div>
                                </div>
                            </div>
                            <div className="h-[600px] bg-zinc-100/50 p-8 flex items-center justify-center">
                                {currentCampaign.campaign_html_body ? (
                                    <div className="w-full h-full bg-white rounded-lg shadow-sm ring-1 ring-zinc-200 overflow-hidden">
                                        <iframe
                                            srcDoc={currentCampaign.campaign_html_body}
                                            className="w-full h-full border-0"
                                            title="Email Preview"
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-muted-foreground text-sm">Preview not available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Configuration & Meta */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Configuration</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Subject Line</div>
                                    <p className="text-sm font-medium leading-relaxed">{currentCampaign.subject || 'No subject line'}</p>
                                </div>

                                <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Audience</div>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <div className="bg-indigo-100 text-indigo-700 p-1 rounded">
                                            <MousePointer className="h-3.5 w-3.5" />
                                        </div>
                                        {/* TODO: Fetch audience name properly if needed, currently reliant on segment_ids or manual lookup in wizard logic */}
                                        {currentCampaign.segment_ids?.length ? 'Selection' : 'All Subscribers'}
                                        {/* Simplify for now as store doesn't easily expose audience name instantly without lookup */}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">From</div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {/* Add sender details if available in type, otherwise fallback or omit */}
                                        marketing@gracefulhomeschooling.com
                                    </p>
                                </div>

                                <div className="pt-4 border-t">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Internal ID</div>
                                    <p className="text-xs font-mono text-zinc-400 truncate">{campaignId}</p>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    )
}
