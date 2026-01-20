'use client'

import React, { useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCampaignWizardStore } from './store'
import { StepSettings } from './steps/step-settings'
import { StepAudience } from './steps/step-audience'
import { StepDesign } from './steps/step-design'
import { StepReview } from './steps/step-review'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { StepTemplate } from './steps/step-template'
import { EditorRef } from '@/app/admin/email-templates/unlayer-email-editor'

interface CampaignWizardPageProps {
    campaignId?: string
    onBack?: () => void
}

export default function CampaignWizardPage({ campaignId: propId, onBack }: CampaignWizardPageProps) {
    const searchParams = useSearchParams()
    const campaignId = propId || searchParams.get('id')
    const { currentStep, setStep, updateDraft, loadCampaign, resetDraft, isLoading } = useCampaignWizardStore()
    const editorRef = useRef<EditorRef>(null)

    // Hydrate from ID if present, otherwise reset for new campaign
    useEffect(() => {
        if (campaignId) {
            loadCampaign(campaignId)
        } else {
            resetDraft()
        }
    }, [campaignId, loadCampaign, resetDraft])

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading campaign...</span>
            </div>
        )
    }

    const handleNext = async () => {
        if (currentStep === 4) { // Design Step (was 3)
            // Special handling for Design Step: Extract HTML
            if (editorRef.current) {
                editorRef.current.exportHtml((data) => {
                    const { design, html } = data
                    updateDraft({
                        designJson: design,
                        htmlContent: html
                    })
                    setStep(currentStep + 1)
                })
                // exportHtml is async/callback based
                return
            }
        }

        // Template Step (3) -> Design (4)
        if (currentStep === 3) {
            setStep(4)
            return
        }

        // Default behavior
        setStep(currentStep + 1)
    }

    const handleBack = () => {
        if (currentStep === 1 && onBack) {
            onBack()
            return
        }
        setStep(currentStep - 1)
    }

    const steps = [
        { id: 1, title: 'Settings', description: 'Subject & Type' },
        { id: 2, title: 'Audience', description: 'Who to send to' },
        { id: 3, title: 'Template', description: 'Pick base' },
        { id: 4, title: 'Design', description: 'Create content' },
        { id: 5, title: 'Review', description: 'Ready to send' },
    ]

    return (
        <div className="container mx-auto py-8">
            {/* Header */}
            <div className="mb-8">
                <CardTitle className="text-3xl font-bold">New Campaign</CardTitle>
                <CardDescription>Create and schedule a new email broadcast.</CardDescription>
            </div>

            {/* Progress Stepper */}
            <div className="relative mb-8 px-4">
                <div className="flex items-center justify-between relative z-10">
                    {steps.map((s, index) => (
                        <div key={s.id} className="flex flex-col items-center bg-background px-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${currentStep === s.id ? 'bg-primary text-primary-foreground border-primary' : currentStep > s.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-muted'}`}
                            >
                                {s.id}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${currentStep === s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>
                {/* Progress Bar Background */}
                <div className="absolute left-0 right-0 top-5 h-[2px] bg-muted -z-0 mx-8 md:mx-16" />
            </div>


            <div className="min-h-[400px] mb-8">
                {currentStep === 1 && <StepSettings />}
                {currentStep === 2 && <StepAudience />}
                {currentStep === 3 && <StepTemplate onNext={handleNext} />}
                {currentStep === 4 && <StepDesign ref={editorRef} />}
                {currentStep === 5 && <StepReview campaignId={campaignId} />}
            </div>


            {/* Footer Navigation */}
            <div className="flex justify-between items-center py-6 border-t bg-background sticky bottom-0 z-20">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1 && !onBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                {currentStep < 5 && currentStep !== 3 ? ( // Hide Next on Step 3 (Template) as it handles next itself
                    <Button onClick={handleNext}>
                        Next Step
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : currentStep === 3 ? (
                    <div /> // Next handled by selection
                ) : (
                    <div />
                    // Review step has its own actions (Send/Schedule) inside StepReview
                )}
            </div>
        </div>
    )
}
