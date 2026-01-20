'use client'

import { useCampaignWizardStore } from "../store"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Mail, Zap } from "lucide-react"

export function StepSettings() {
    const { name, subject, previewText, streamType, updateDraft } = useCampaignWizardStore()

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Details</CardTitle>
                    <CardDescription>Basic information for this email campaign.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Internal Campaign Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. January Newsletter 2026"
                            value={name}
                            onChange={(e) => updateDraft({ name: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Only visible to admins, not recipients.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject Line</Label>
                        <Input
                            id="subject"
                            placeholder="e.g. Welcome to the Community!"
                            value={subject}
                            onChange={(e) => updateDraft({ subject: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="preview">Preview Text (Preheader)</Label>
                        <Input
                            id="preview"
                            placeholder="A short summary displayed next to the subject line..."
                            value={previewText}
                            onChange={(e) => updateDraft({ previewText: e.target.value })}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Stream Type</CardTitle>
                    <CardDescription>How should this email be delivered?</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={streamType}
                        onValueChange={(val: 'broadcast' | 'outbound') => updateDraft({ streamType: val })}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="broadcast" id="broadcast" className="peer sr-only" />
                            <Label
                                htmlFor="broadcast"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <Mail className="mb-3 h-6 w-6" />
                                <div className="text-center">
                                    <div className="font-semibold">Broadcast</div>
                                    <span className="text-xs text-muted-foreground">Marketing & Newsletters</span>
                                </div>
                            </Label>
                        </div>

                        <div>
                            <RadioGroupItem value="outbound" id="outbound" className="peer sr-only" />
                            <Label
                                htmlFor="outbound"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <Zap className="mb-3 h-6 w-6" />
                                <div className="text-center">
                                    <div className="font-semibold">Transactional</div>
                                    <span className="text-xs text-muted-foreground">Alerts & Notifications</span>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
        </div>
    )
}
