import { create } from 'zustand'

export interface CampaignDraft {
    name: string
    subject: string
    previewText: string
    audienceId: string | null
    audienceName?: string
    audienceCount?: number | null
    designJson: any | null // Unlayer JSON
    htmlContent: string | null
    scheduleAt: Date | null
    streamType: 'broadcast' | 'outbound'
    templateId?: string | null
}

interface CampaignWizardStore extends CampaignDraft {
    // Actions
    updateDraft: (updates: Partial<CampaignDraft>) => void
    resetDraft: () => void

    // UI State
    currentStep: number
    setStep: (step: number) => void
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
    loadCampaign: (id: string) => Promise<void>
}

const INITIAL_STATE: CampaignDraft = {
    name: '',
    subject: '',
    previewText: '',
    audienceId: null,
    audienceName: '',
    audienceCount: null,
    designJson: null,
    htmlContent: null,
    scheduleAt: null,
    streamType: 'broadcast',
    templateId: null
}

export const useCampaignWizardStore = create<CampaignWizardStore>((set) => ({
    ...INITIAL_STATE,
    currentStep: 1,
    isLoading: false,

    updateDraft: (updates) => set((state) => ({ ...state, ...updates })),
    resetDraft: () => set({ ...INITIAL_STATE, currentStep: 1 }),
    setStep: (step) => set({ currentStep: step }),
    setIsLoading: (loading) => set({ isLoading: loading }),

    loadCampaign: async (id: string) => {
        set({ isLoading: true })
        try {
            const { getCampaignForWizard, getAudienceDetails } = await import('./actions')
            const campaign = await getCampaignForWizard(id)
            const audienceDetails = await getAudienceDetails(campaign.audienceId)

            set({
                name: campaign.name || '',
                subject: campaign.subject || '',
                previewText: campaign.previewText || '',
                audienceId: campaign.audienceId,
                audienceName: audienceDetails.name,
                audienceCount: audienceDetails.count,
                designJson: campaign.designJson,
                htmlContent: campaign.htmlContent,
                scheduleAt: campaign.scheduleAt ? new Date(campaign.scheduleAt) : null,
                isLoading: false
                // We typically stay on step 1 or move to step needed. 
                // For now, let's keep user at step 1 to review settings.
            })
        } catch (error) {
            console.error('Failed to load campaign into wizard', error)
            set({ isLoading: false })
            // You might want to set an error state here
        }
    }
}))
