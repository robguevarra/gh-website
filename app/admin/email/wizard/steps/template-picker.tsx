import { useEffect, useState } from "react"
import { getTemplates } from "../actions"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, LayoutTemplate, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Template {
    id: string
    name: string
    description: string
    thumbnail_url: string | null
    json_content: any
}

interface TemplatePickerProps {
    onSelect: (template: Template | null) => void
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
    const [templates, setTemplates] = useState<Template[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

    useEffect(() => {
        console.log('[TemplatePicker] Requesting templates...')
        getTemplates()
            .then((data) => {
                console.log('[TemplatePicker] Received:', data?.length)
                // @ts-ignore
                setTemplates(data)
            })
            .catch((err) => console.error('[TemplatePicker] Failed to load:', err))
            .finally(() => setIsLoading(false))
    }, [])

    const handleTemplateChange = (value: string) => {
        setSelectedTemplateId(value)
    }

    const handleContinueWithTemplate = () => {
        const t = templates.find(t => t.id === selectedTemplateId)
        if (t) {
            onSelect(t)
        }
    }

    if (isLoading) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading templates...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Choose a Starting Point</h3>
                    <p className="text-sm text-muted-foreground">Start from scratch or convert an existing template.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-8">
                {/* Method 1: Start from Scratch */}
                <div onClick={() => onSelect(null)} className="cursor-pointer group">
                    <Card className="h-full border-dashed hover:border-primary hover:bg-muted/5 transition-all text-center flex flex-col items-center justify-center p-8 space-y-4">
                        <div className="w-20 h-20 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg">Start from Scratch</h4>
                            <p className="text-sm text-muted-foreground">Design your email on a blank canvas.</p>
                        </div>
                    </Card>
                </div>

                {/* Method 2: Pick a Template */}
                <div className="space-y-4">
                    <Card className="h-full border-border hover:border-primary/50 transition-all p-8 flex flex-col justify-center space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                                <LayoutTemplate className="h-8 w-8" />
                            </div>
                            <h4 className="font-semibold text-lg">Use a Template</h4>
                            <p className="text-sm text-muted-foreground">Select a pre-made design to customize.</p>
                        </div>

                        <div className="space-y-4">
                            <Select onValueChange={handleTemplateChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a template..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                className="w-full"
                                disabled={!selectedTemplateId}
                                onClick={handleContinueWithTemplate}
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Load Template
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
