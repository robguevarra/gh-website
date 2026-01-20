'use client'

import { useEffect, useState } from "react"
import { useCampaignWizardStore } from "../store"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { getSmartLists, SmartList } from "@/app/admin/directory/actions"
import { Users, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"

export function StepAudience() {
    const { audienceId, updateDraft } = useCampaignWizardStore()
    const [smartLists, setSmartLists] = useState<any[]>([])
    const [segments, setSegments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Dynamic import to avoid server-action issues if directly imported in client component sometimes
        import('../actions').then(({ getAudiences }) => {
            getAudiences().then(data => {
                setSmartLists(data.smartLists)
                setSegments(data.segments)
                setLoading(false)
            })
        })
    }, [])

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Select Audience</CardTitle>
                    <CardDescription>Who should receive this email?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Audience Source</Label>
                        <Select
                            value={loading ? undefined : (audienceId || "all_users")}
                            onValueChange={(val) => {
                                if (val === "all_users") {
                                    updateDraft({ audienceId: null, audienceName: 'All Active Users', audienceCount: null })
                                } else {
                                    // Find details
                                    const list = smartLists.find(l => l.id === val)
                                    const segment = segments.find(s => s.id === val)
                                    const found = list || segment

                                    updateDraft({
                                        audienceId: val,
                                        audienceName: found?.name || 'Unknown Audience',
                                        audienceCount: found?.user_count || null
                                    })
                                }
                            }}
                            disabled={loading}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={loading ? "Loading audiences..." : "Select a list or segment..."} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all_users">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span>All Active Users (Broadcast)</span>
                                    </div>
                                </SelectItem>

                                {smartLists.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Smart Lists (CRM)</SelectLabel>
                                        {smartLists.map(list => (
                                            <SelectItem key={list.id} value={list.id}>
                                                <div className="flex items-center gap-2">
                                                    <Filter className="h-4 w-4 text-blue-500" />
                                                    <span>{list.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}

                                {segments.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Segments (Marketing)</SelectLabel>
                                        {segments.map(segment => (
                                            <SelectItem key={segment.id} value={segment.id}>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-purple-500" />
                                                    <span>{segment.name}</span>
                                                    {segment.description && (
                                                        <span className="text-xs text-muted-foreground ml-2 truncate max-w-[200px]">- {segment.description}</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Smart Lists and Segments automatically update based on their rules.
                        </p>
                    </div>

                    <div className="pt-4 border-t">
                        <Button variant="outline" className="w-full" disabled>
                            <Filter className="mr-2 h-4 w-4" />
                            Create New Audience (Coming Phase 4)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
