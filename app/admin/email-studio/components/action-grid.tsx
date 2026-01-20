'use client'

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Mail, Zap, Users, Plus } from "lucide-react"

export function ActionGrid() {
    const router = useRouter()

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* New Broadcast Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-background border-indigo-200 dark:border-indigo-800">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                            <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <CardTitle className="text-xl">Broadcast Wizard</CardTitle>
                    </div>
                    <CardDescription className="mb-4">
                        Create beautifully designed emails using our new orchestrated wizard.
                    </CardDescription>
                    <Button
                        onClick={() => router.push('/admin/email/wizard')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Campaign
                    </Button>
                </CardHeader>
            </Card>

            {/* Automations Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <CardTitle className="text-xl">Cortex Automations</CardTitle>
                    </div>
                    <CardDescription className="mb-4">
                        Manage event-driven flows like "Checkout Abandonment" and "Welcome Series".
                    </CardDescription>
                    <Button
                        variant="outline"
                        className="w-full"
                        disabled // Phase 4
                    >
                        Manage Triggers (Coming Soon)
                    </Button>
                </CardHeader>
            </Card>

            {/* Audience Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle className="text-xl">Audience Segments</CardTitle>
                    </div>
                    <CardDescription className="mb-4">
                        View your Unified Directory or manage Smart Lists (Segments).
                    </CardDescription>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push('/admin/directory')}
                    >
                        Go to Directory
                    </Button>
                </CardHeader>
            </Card>
        </div>
    )
}
