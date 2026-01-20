'use client'

import { useQuery } from "@tanstack/react-query"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getContactDetails } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Mail, Shield, ShoppingBag, XCircle } from "lucide-react"

import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { UserCommunications } from "./user-communications"
import { UserPurchases } from "./user-purchases"
import { UserActions } from "./user-actions"

interface UserDrawerProps {
    contactid: string | null
    type: 'customer' | 'lead' | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UserDrawer({ contactid, type, open, onOpenChange }: UserDrawerProps) {
    const { data: contact, isLoading } = useQuery({
        queryKey: ['contact', contactid],
        queryFn: () => contactid && type ? getContactDetails(contactid, type) : null,
        enabled: !!contactid && !!type && open
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-4">
                        <VisuallyHidden>
                            <DialogTitle>Loading Details</DialogTitle>
                        </VisuallyHidden>
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </div>
                ) : contact ? (
                    <div className="space-y-6">
                        {/* Header */}
                        <DialogHeader>
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant={contact.type === 'customer' ? 'default' : 'secondary'}>
                                    {contact.type}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Joined {contact.created_at ? formatDistanceToNow(new Date(contact.created_at), { addSuffix: true }) : '-'}
                                </span>
                            </div>
                            <DialogTitle className="text-2xl">
                                {contact.first_name || contact.last_name
                                    ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim()
                                    : 'Unknown'}
                            </DialogTitle>
                            <DialogDescription className="text-base select-all">
                                {contact.email}
                            </DialogDescription>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {contact.tags?.map(tag => (
                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                ))}
                            </div>
                        </DialogHeader>

                        {/* Tabs */}
                        <Tabs defaultValue="timeline" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                                <TabsTrigger value="communications">Emails</TabsTrigger>
                                <TabsTrigger value="purchases">Orders</TabsTrigger>
                                <TabsTrigger value="actions">Actions</TabsTrigger>
                            </TabsList>

                            {/* Timeline Tab */}
                            <TabsContent value="timeline" className="space-y-4 mt-4 h-[500px]">
                                <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
                                <ScrollArea className="h-full pr-4">
                                    {contact.activities && contact.activities.length > 0 ? (
                                        <div className="relative border-l ml-2 space-y-6 pb-4">
                                            {contact.activities.map((activity) => (
                                                <div key={activity.id} className="ml-4 flex flex-col gap-1 relative">
                                                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border bg-background" />
                                                    <span className="text-sm font-medium leading-none">
                                                        {activity.type.replace(/\./g, ' ')}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
                                                    </span>
                                                    {/* Simple generic metadata display for now */}
                                                    {activity.metadata && Object.keys(activity.metadata as object).length > 0 && (
                                                        <pre className="text-[10px] bg-muted p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
                                                            {JSON.stringify(activity.metadata, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">No recent activity recorded.</div>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            {/* Communications Tab */}
                            <TabsContent value="communications" className="mt-4 h-[500px]">
                                <ScrollArea className="h-full pr-4">
                                    <UserCommunications email={contact.email} />
                                </ScrollArea>
                            </TabsContent>

                            {/* Purchases Tab */}
                            <TabsContent value="purchases" className="mt-4 h-[500px]">
                                <ScrollArea className="h-full pr-4">
                                    <UserPurchases email={contact.email} />
                                </ScrollArea>
                            </TabsContent>

                            {/* Admin Actions Tab */}
                            <TabsContent value="actions" className="space-y-6 mt-4 h-[500px]">
                                <ScrollArea className="h-full pr-4">
                                    <UserActions contact={contact} />
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Contact not found</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
