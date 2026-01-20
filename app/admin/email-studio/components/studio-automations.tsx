'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Zap, Settings, Plus, Play, Pause, MoreHorizontal, MousePointerClick, Mail, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { getAutomations, toggleAutomationStatus, createAutomation } from '../actions'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Automation {
    id: string
    name: string
    description?: string
    trigger_type: string
    status: 'active' | 'draft' | 'paused'
    stats?: {
        sent: number
        opened: number
        clicked: number
        recovered?: number
    }
    updated_at: string
}

export function StudioAutomations() {
    const [automations, setAutomations] = useState<Automation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [newAutomationName, setNewAutomationName] = useState('')
    const [newAutomationType, setNewAutomationType] = useState('abandoned_checkout')

    const fetchAutomations = async () => {
        setIsLoading(true)
        const { automations, error } = await getAutomations()
        if (error) {
            toast.error("Failed to load automations")
        } else {
            setAutomations(automations || [])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchAutomations()
    }, [])

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const { automation, error } = await toggleAutomationStatus(id, currentStatus)
        if (error) {
            toast.error("Failed to update status")
        } else {
            setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: automation.status } : a))
            toast.success(`Automation ${automation.status === 'active' ? 'activated' : 'deactivated'}`)
        }
    }

    const handleCreate = async () => {
        if (!newAutomationName.trim()) {
            toast.error("Please enter a name")
            return
        }

        setIsCreating(true)
        const { automation, error } = await createAutomation({
            name: newAutomationName,
            trigger_type: newAutomationType,
            description: newAutomationType === 'abandoned_checkout' ? 'Recover lost sales' : 'Welcome new subscribers'
        })

        if (error) {
            toast.error("Failed to create automation")
        } else {
            toast.success("Automation created")
            setAutomations(prev => [automation, ...prev])
            setNewAutomationName('')
            // Close dialog logic would go here if controlled, but strictly using primitive for now
        }
        setIsCreating(false)
    }

    const getIconForType = (type: string) => {
        switch (type) {
            case 'abandoned_checkout': return <AlertCircle className="h-5 w-5 text-amber-500" />
            case 'welcome_series': return <Zap className="h-5 w-5 text-emerald-500" />
            default: return <Settings className="h-5 w-5 text-blue-500" />
        }
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Active Flows</h3>
                    <p className="text-sm text-muted-foreground">Manage your event-driven email sequences.</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Automation
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Automation</DialogTitle>
                            <DialogDescription>
                                Choose a trigger type to start your automation flow.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={newAutomationName}
                                    onChange={(e) => setNewAutomationName(e.target.value)}
                                    placeholder="e.g. Black Friday Abandonment"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">Trigger</Label>
                                <Select value={newAutomationType} onValueChange={setNewAutomationType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select trigger" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="abandoned_checkout">Abandoned Checkout</SelectItem>
                                        <SelectItem value="welcome_series">New Subscriber (Welcome)</SelectItem>
                                        <SelectItem value="course_enrollment">Course Enrollment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={isCreating}>
                                {isCreating ? "Creating..." : "Create Automation"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {automations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
                    <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold">No automations yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">Create your first automation to start engaging customers automatically.</p>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Create Automation</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Automation</DialogTitle>
                                <DialogDescription>
                                    Choose a trigger type to start your automation flow.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={newAutomationName}
                                        onChange={(e) => setNewAutomationName(e.target.value)}
                                        placeholder="e.g. Black Friday Abandonment"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Trigger</Label>
                                    <Select value={newAutomationType} onValueChange={setNewAutomationType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select trigger" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="abandoned_checkout">Abandoned Checkout</SelectItem>
                                            <SelectItem value="welcome_series">New Subscriber (Welcome)</SelectItem>
                                            <SelectItem value="course_enrollment">Course Enrollment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreate} disabled={isCreating}>
                                    {isCreating ? "Creating..." : "Create Automation"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {automations.map((automation) => (
                        <Card key={automation.id} className={`transition-all hover:shadow-md ${automation.status === 'active' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-zinc-300 opacity-90'}`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {getIconForType(automation.trigger_type)}
                                        <CardTitle className="text-base truncate max-w-[150px]" title={automation.name}>{automation.name}</CardTitle>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => window.location.href = `/admin/email-studio/automations/${automation.id}`}>
                                                Edit Flow
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>Edit Settings</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardDescription className="text-xs line-clamp-1 cursor-pointer hover:underline" onClick={() => window.location.href = `/admin/email-studio/automations/${automation.id}`}>
                                    {automation.description || 'No description'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold">{automation.stats?.sent || 0}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Sent</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-2xl font-bold">{automation.stats?.opened || 0}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Opened</span>
                                    </div>
                                </div>

                                {automation.trigger_type === 'abandoned_checkout' && (
                                    <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg flex items-center justify-between">
                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Recovered Revenue</span>
                                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">₱{((automation.stats?.recovered || 0) * 1000).toLocaleString()}</span>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-0 flex items-center justify-between">
                                <div className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded ${automation.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                    {automation.status === 'active' ? <Play className="h-3 w-3 fill-current" /> : <Pause className="h-3 w-3 fill-current" />}
                                    {automation.status === 'active' ? 'Active' : 'Draft'}
                                </div>

                                <Switch
                                    checked={automation.status === 'active'}
                                    onCheckedChange={() => handleToggleStatus(automation.id, automation.status)}
                                />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
