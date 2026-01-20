'use client'

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function CampaignDesignPage() {
    const params = useParams()
    const id = params.id as string

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Design Email</h1>
                    <p className="text-muted-foreground">ID: {id}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Save Draft</Button>
                    <Button>Send Test</Button>
                </div>
            </div>

            <Card className="h-[600px] flex items-center justify-center border-dashed bg-muted/20">
                <div className="text-center">
                    <h3 className="text-xl font-semibold">Visual Editor V2 (Coming Soon)</h3>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                        This is where the new optimized Unlayer editor will live.
                        It will load the template associated with campaign {id}.
                    </p>
                </div>
            </Card>
        </div>
    )
}
