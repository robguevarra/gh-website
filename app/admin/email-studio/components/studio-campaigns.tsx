'use client'

import { useEffect, useState } from 'react'
import { useCampaignStore } from '@/lib/hooks/use-campaign-store'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
    Loader2,
    MoreHorizontal,
    Pencil,
    Trash2,
    Send,
    Calendar,
    FileEdit,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

// Premium "Linear" Status Badge
function StatusBadge({ status }: { status: string }) {
    const styles = {
        draft: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-600 dark:border-zinc-800",
        scheduled: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
        sending: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
        sent: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
        failed: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    }

    // Normalize status
    const key = (status?.toLowerCase() || 'draft') as keyof typeof styles
    const style = styles[key] || styles.draft

    const iconMap = {
        draft: FileEdit,
        scheduled: Clock,
        sending: Loader2,
        sent: CheckCircle2,
        failed: AlertCircle
    }
    const Icon = iconMap[key] || FileEdit

    return (
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider", style)}>
            <Icon className="w-3 h-3 mr-1" />
            {status}
        </span>
    )
}

interface StudioCampaignsProps {
    onSelectCampaign?: (id: string) => void
}

export function StudioCampaigns({ onSelectCampaign }: StudioCampaignsProps) {
    const router = useRouter()
    const { toast } = useToast()
    const { campaigns, totalCampaigns, campaignsLoading, fetchCampaigns, deleteCampaign } = useCampaignStore()
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchCampaigns({ limit: 20, offset: 0 }) // Fetch first page
    }, [fetchCampaigns])

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this campaign?')) return

        setIsDeleting(true)
        try {
            await deleteCampaign(id)
            toast({ title: 'Campaign deleted' })
        } catch (error) {
            toast({ title: 'Error deleting campaign', variant: 'destructive' })
        } finally {
            setIsDeleting(false)
        }
    }

    if (campaignsLoading && campaigns.length === 0) {
        return <div className="p-8 flex justify-center text-muted-foreground"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading campaigns...</div>
    }

    const handleSelect = (id: string) => {
        if (onSelectCampaign) {
            onSelectCampaign(id)
        } else {
            router.push(`/admin/email/campaigns/${id}`)
        }
    }

    return (
        <div className="w-full">
            {/* Header Row */}
            <div className="grid grid-cols-12 px-4 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Campaign</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Scheduled</div>
                <div className="col-span-2">Stats</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* List Rows */}
            <div className="divide-y border-b">
                {campaigns.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No campaigns found. Create one to get started.</div>
                ) : (
                    campaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            onClick={() => handleSelect(campaign.id)}
                            className="grid grid-cols-12 px-4 py-3 items-center hover:bg-muted/50 transition-colors cursor-pointer group text-sm"
                        >
                            {/* Campaign Name */}
                            <div className="col-span-4 pr-4">
                                <div className="font-medium text-foreground truncate">{campaign.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{campaign.subject}</div>
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                                <StatusBadge status={campaign.status} />
                            </div>

                            {/* Schedule */}
                            <div className="col-span-2 text-muted-foreground text-xs">
                                {campaign.scheduled_at ? format(new Date(campaign.scheduled_at), 'MMM d, h:mm a') : '-'}
                            </div>

                            {/* Stats */}
                            <div className="col-span-2 flex items-center gap-3 text-xs">
                                {(campaign.status === 'sent' || campaign.status === 'completed') ? (
                                    <>
                                        {campaign.campaign_analytics ? (
                                            <span className="text-zinc-600 dark:text-zinc-400">
                                                {(() => {
                                                    const stats = Array.isArray(campaign.campaign_analytics)
                                                        ? campaign.campaign_analytics[0]
                                                        : campaign.campaign_analytics;

                                                    if (!stats) return 'View details';

                                                    return `${Math.round(stats.open_rate || 0)}% Opn, ${Math.round(stats.click_rate || 0)}% Clk`;
                                                })()}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">View details</span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </div>

                            {/* Actions (Visible on Hover) */}
                            <div className="col-span-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); handleSelect(campaign.id) }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={(e) => handleDelete(campaign.id, e)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 text-xs text-muted-foreground text-center">
                Showing {campaigns.length} of {totalCampaigns} campaigns
            </div>
        </div>
    )
}
