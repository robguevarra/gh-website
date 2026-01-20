'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/navigation'
import { AudienceSelector, AudienceSelection } from "../components/audience-selector"
import { createCampaign } from "../actions"
import { toast } from "sonner"

export default function NewCampaignPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        previewText: '',
        audience: { type: 'all' } as AudienceSelection
    })

    // Simple step validation/navigation
    const handleNext = () => {
        setStep(prev => prev + 1)
    }

    const handleCreate = async () => {
        try {
            setIsSubmitting(true)
            const result = await createCampaign({
                name: formData.name,
                subject: formData.subject,
                preview_text: formData.previewText, // Note: mapped from previewText
                audience: formData.audience
            })

            toast.success("Campaign created successfully!")

            // Redirect to the design/editor page
            router.push(`/admin/email/campaigns/${result.campaignId}/design`)

        } catch (error) {
            console.error(error)
            toast.error("Failed to create campaign. Please try again.")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">New Campaign</h1>
                <p className="text-muted-foreground">Create and schedule a new email broadcast.</p>
            </div>

            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Campaign Details</CardTitle>
                        <CardDescription>
                            Basic information about your email campaign.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Internal Campaign Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. January Newsletter"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Only visible to admins.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject Line</Label>
                            <Input
                                id="subject"
                                placeholder="What members will see in their inbox"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="preview">Preview Text</Label>
                            <Input
                                id="preview"
                                placeholder="Short summary appearing after subject line"
                                value={formData.previewText}
                                onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleNext} disabled={!formData.name || !formData.subject}>
                                Next: Select Audience
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Audience</CardTitle>
                        <CardDescription>
                            Who should receive this email?
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AudienceSelector
                            selection={formData.audience}
                            onChange={(sel) => setFormData({ ...formData, audience: sel })}
                        />

                        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-semibold mb-2">Summary</h4>
                            <div className="flex justify-between text-sm">
                                <span>Target Audience:</span>
                                <span className="font-medium capitalize">{formData.audience.type === 'smart_list' ? 'Smart List' : formData.audience.type} Contacts</span>
                            </div>
                            {/* Placeholder for real-time count */}
                            <div className="flex justify-between text-sm mt-1">
                                <span>Estimated Recipients:</span>
                                <span className="font-medium">~ Calculating...</span>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-between">
                            <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                                Back
                            </Button>
                            <Button onClick={handleCreate} disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create & Design Email"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
