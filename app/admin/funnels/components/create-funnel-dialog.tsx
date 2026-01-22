"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Sparkles, Target } from "lucide-react"
import { toast } from "sonner"

import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    conversion_goal: z.string({
        required_error: "Please select a conversion goal",
    }).min(1, "Please select a conversion goal"),
})

interface CreateFunnelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateFunnelDialog({ open, onOpenChange }: CreateFunnelDialogProps) {
    const router = useRouter()
    const supabase = createBrowserSupabaseClient()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            conversion_goal: "checkout.completed",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            // 1. Create the underlying automation
            // "Premium" experience means we might pre-seed the graph based on goal later
            // For now, we start with a blank canvas but with correct attribution settings
            const { data: automation, error: autoError } = await (supabase as any)
                .from('email_automations')
                .insert({
                    name: values.name,
                    description: values.description,
                    status: 'draft',
                    trigger_type: 'manual', // Funnels usually start manually or via specific entry points
                    graph: { nodes: [], edges: [] }
                })
                .select('id')
                .single()

            if (autoError) throw new Error(`Automation creation failed: ${autoError.message}`)

            // 2. Create the Funnel Wrapper
            const { data: funnel, error: funnelError } = await (supabase as any)
                .from('email_funnels')
                .insert({
                    name: values.name,
                    automation_id: automation.id,
                    status: 'draft',
                    conversion_goal_event: values.conversion_goal,
                    // Default settings could be dynamic in V2
                    settings: { attribution_window_days: 30 }
                })
                .select('id')
                .single()

            if (funnelError) throw new Error(`Funnel creation failed: ${funnelError.message}`)

            toast.success("Funnel initialized successfully!")
            onOpenChange(false)
            router.push(`/admin/funnels/${funnel.id}`)

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Create New Funnel
                    </DialogTitle>
                    <DialogDescription>
                        Configure the clear objective for this customer journey.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Funnel Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Black Friday Sale 2026" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="conversion_goal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Primary Goal</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a goal" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="checkout.completed">
                                                <div className="flex items-center gap-2">
                                                    <Target className="h-4 w-4 text-green-500" />
                                                    <span>Purchase (Revenue)</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="tag_added">
                                                <div className="flex items-center gap-2">
                                                    <Target className="h-4 w-4 text-blue-500" />
                                                    <span>Lead Generation (Tag)</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="custom_event">
                                                <div className="flex items-center gap-2">
                                                    <Target className="h-4 w-4 text-orange-500" />
                                                    <span>Custom Event</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        What defines "Success" for this funnel? We'll track ROI based on this.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="What is the strategy behind this funnel?"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Initialize Funnel"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
