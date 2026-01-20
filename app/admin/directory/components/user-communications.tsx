'use client'

import React from 'react'
import { useQuery } from "@tanstack/react-query"
import { getDirectoryEmailHistory } from "../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { Mail, MailOpen, MousePointerClick, AlertTriangle } from "lucide-react"

interface UserCommunicationsProps {
    email: string
}

export function UserCommunications({ email }: UserCommunicationsProps) {
    const { data, isLoading } = useQuery({
        queryKey: ['email-history', email],
        queryFn: () => getDirectoryEmailHistory(email),
        enabled: !!email
    })

    const [expandedThread, setExpandedThread] = React.useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    if (!data) return <div className="text-muted-foreground p-4">No email history available.</div>

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Open Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.stats.openRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">{data.stats.opened} / {data.stats.delivered} Delivered</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Click Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.clickRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">{data.stats.clicked} / {data.stats.delivered} Delivered</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border bg-background">
                <div className="p-4 border-b bg-muted/20">
                    <h3 className="font-medium text-sm">Recent Emails</h3>
                </div>
                <ScrollArea className="h-[350px]">
                    {data.threads.length > 0 ? (
                        <div className="divide-y">
                            {data.threads.map((thread: any) => {
                                const isExpanded = expandedThread === thread.message_id

                                return (
                                    <div key={thread.message_id} className="group">
                                        <div
                                            className="p-4 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 items-start"
                                            onClick={() => setExpandedThread(isExpanded ? null : thread.message_id)}
                                        >
                                            <div className="mt-1 text-muted-foreground">
                                                {thread.status === 'opened' && <MailOpen className="h-4 w-4 text-blue-500" />}
                                                {thread.status === 'clicked' && <MousePointerClick className="h-4 w-4 text-purple-500" />}
                                                {thread.status === 'bounced' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                                {(thread.status === 'sent' || thread.status === 'delivered') && <Mail className="h-4 w-4" />}
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">
                                                        {thread.subject}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        {format(new Date(thread.last_event_at), 'MMM d, h:mm a')}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1 font-normal">
                                                        {thread.campaign_name || 'Transactional'}
                                                    </Badge>
                                                    <Badge variant={thread.status === 'bounced' ? 'destructive' : 'outline'} className="text-[10px] h-5 px-1 capitalize font-normal">
                                                        {thread.status}
                                                    </Badge>
                                                    {thread.events.length > 1 && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {thread.events.length} events
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Events Timeline */}
                                        {isExpanded && (
                                            <div className="bg-muted/30 px-4 pb-4 pt-1 border-t border-muted/50 ml-8 mb-2 rounded-bl-md">
                                                <div className="space-y-3 pt-3 border-l-2 border-muted pl-4">
                                                    {thread.events.slice().reverse().map((event: any) => (
                                                        <div key={event.id} className="relative">
                                                            <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-muted-foreground/30" />
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-medium capitalize">{event.event_type}</span>
                                                                <span className="text-muted-foreground">
                                                                    {format(new Date(event.created_at), 'h:mm:ss a')}
                                                                </span>
                                                            </div>
                                                            {event.metadata && (
                                                                <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-full">
                                                                    ID: {event.id.slice(0, 8)}...
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-8">No email conversations found.</div>
                    )}
                </ScrollArea>
            </div>
        </div>
    )
}
