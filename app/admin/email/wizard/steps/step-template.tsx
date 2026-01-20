'use client'

import { useCampaignWizardStore } from "../store"
import { TemplatePicker } from "./template-picker"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface StepTemplateProps {
    onNext: () => void
}

export function StepTemplate({ onNext }: StepTemplateProps) {
    const { updateDraft, designJson } = useCampaignWizardStore()

    const handleSelect = (template: any | null) => {
        if (template) {
            updateDraft({
                designJson: template.json_content,
                templateId: template.id
            })
        } else {
            // Clear design for scratch
            updateDraft({
                designJson: null,
                templateId: null
            })
        }
        onNext()
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-end">
                {designJson && (
                    <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
                        Skip / Keep Current Design <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>

            <TemplatePicker onSelect={handleSelect} />
        </div>
    )
}
