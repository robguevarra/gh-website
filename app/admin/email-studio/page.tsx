'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StudioSidebar } from "./components/studio-sidebar"
import { StudioOverview } from "./components/studio-overview"
import { StudioCampaigns } from "./components/studio-campaigns"
import { StudioTemplates } from "./components/studio-templates"
import { StudioAudience } from "./components/studio-audience"
import { StudioAutomations } from "./components/studio-automations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CampaignStats } from "@/app/admin/email/campaigns/[id]/campaign-stats"
import CampaignWizardPage from "@/app/admin/email/wizard/page"
import { useSearchParams } from "next/navigation"

export default function EmailStudioPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState("overview")
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
    const [isWizardOpen, setIsWizardOpen] = useState(false)

    // Handle wizard open check from URL if needed, but better to control state directly

    const handleSelectCampaign = (id: string) => {
        setSelectedCampaignId(id)
    }

    const handleBackToCampaigns = () => {
        setSelectedCampaignId(null)
    }

    const handleOpenWizard = () => {
        setIsWizardOpen(true)
        // Optionally update URL for deep linking support
        // router.push('?wizard=true', { scroll: false })
    }

    const handleCreateCampaign = () => {
        setSelectedCampaignId(null)
        handleOpenWizard()
    }

    const handleCloseWizard = () => {
        setIsWizardOpen(false)
        if (!selectedCampaignId) {
            handleBackToCampaigns()
        }
    }

    const renderContent = () => {
        if (isWizardOpen) {
            return (
                <div className="bg-background min-h-full">
                    <div className="mb-4">
                        <Button variant="ghost" onClick={handleCloseWizard}>&larr; Exit Wizard</Button>
                    </div>
                    <CampaignWizardPage
                        campaignId={selectedCampaignId || undefined}
                        onBack={handleCloseWizard}
                    />
                </div>
            )
        }

        if (activeTab === "overview") return <StudioOverview />

        if (activeTab === "campaigns") {
            if (selectedCampaignId) {
                return (
                    <CampaignStats
                        campaignId={selectedCampaignId}
                        onBack={handleBackToCampaigns}
                        onEdit={handleOpenWizard}
                        onDuplicate={(newId) => {
                            setSelectedCampaignId(newId)
                            handleOpenWizard()
                        }}
                    />
                )
            }
            return <StudioCampaigns onSelectCampaign={handleSelectCampaign} />
        }

        if (activeTab === "audience") return <StudioAudience />

        if (activeTab === "templates") return <StudioTemplates />

        if (activeTab === "automations") return <StudioAutomations />
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            {/* Sidebar Shell */}
            <StudioSidebar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto h-[calc(100vh)] max-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
                <div className="container py-8 max-w-[1600px] mx-auto space-y-8 px-8">

                    {/* Header Action Area - Only show if NOT in detail/wizard view to avoid clutter */}
                    {!selectedCampaignId && !isWizardOpen && (
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight capitalize text-zinc-900 dark:text-zinc-50">
                                    {activeTab}
                                </h1>
                                <p className="text-zinc-500 text-sm mt-1">
                                    {activeTab === "overview" && "Your marketing command center."}
                                    {activeTab === "campaigns" && "Manage your broadcasts and newsletters."}
                                    {activeTab === "audience" && "Manage your smart lists and segments."}
                                    {activeTab === "templates" && "Design and organize your email templates."}
                                    {activeTab === "automations" && "Configure event-driven flows."}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                {activeTab === "overview" && (
                                    <>
                                        <Button variant="outline" onClick={() => setActiveTab("templates")}>
                                            Manage Templates
                                        </Button>
                                        <Button onClick={() => { setActiveTab("campaigns"); handleCreateCampaign(); }}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            New Campaign
                                        </Button>
                                    </>
                                )}
                                {activeTab === "campaigns" && (
                                    <Button onClick={handleCreateCampaign}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        New Campaign
                                    </Button>
                                )}

                            </div>
                        </div>
                    )}

                    {/* View Switcher with Animations */}
                    <div className="space-y-6">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    )
}
