import { useRef, forwardRef } from "react"
import { useCampaignWizardStore } from "../store"
import UnlayerEmailEditor, { EditorRef } from "@/app/admin/email-templates/unlayer-email-editor"

export const StepDesign = forwardRef<EditorRef, {}>((props, ref) => {
    const { designJson } = useCampaignWizardStore()

    // Editor only - Template selection is now in Step 3
    return (
        <div className="h-[800px] border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col relative">
            <UnlayerEmailEditor
                ref={ref}
                initialDesign={designJson || undefined}
                minHeight="100%"
            />
        </div>
    )
})

StepDesign.displayName = 'StepDesign'
