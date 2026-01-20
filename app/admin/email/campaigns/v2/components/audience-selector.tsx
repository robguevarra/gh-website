'use client'

import { useState } from "react"
import { Check, Users, UserCheck, UserPlus, ListFilter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export interface AudienceSelection {
    type: 'all' | 'customer' | 'lead' | 'smart_list'
    smartListId?: string
}

interface AudienceSelectorProps {
    selection: AudienceSelection
    onChange: (selection: AudienceSelection) => void
}

export function AudienceSelector({ selection, onChange }: AudienceSelectorProps) {

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Preset: All Contacts */}
            <Label
                htmlFor="audience-all"
                className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer",
                    selection.type === 'all' && "border-primary bg-accent"
                )}
                onClick={() => onChange({ type: 'all' })}
            >
                <Users className="mb-3 h-6 w-6" />
                <div className="text-center">
                    <h3 className="font-semibold">All Contacts</h3>
                    <p className="text-xs text-muted-foreground mt-1">Everyone in your directory.</p>
                </div>
            </Label>

            {/* Preset: Customers */}
            <Label
                htmlFor="audience-customers"
                className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer",
                    selection.type === 'customer' && "border-primary bg-accent"
                )}
                onClick={() => onChange({ type: 'customer' })}
            >
                <UserCheck className="mb-3 h-6 w-6" />
                <div className="text-center">
                    <h3 className="font-semibold">Customers Only</h3>
                    <p className="text-xs text-muted-foreground mt-1">Users who have purchased products.</p>
                </div>
            </Label>

            {/* Preset: Leads */}
            <Label
                htmlFor="audience-leads"
                className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer",
                    selection.type === 'lead' && "border-primary bg-accent"
                )}
                onClick={() => onChange({ type: 'lead' })}
            >
                <UserPlus className="mb-3 h-6 w-6" />
                <div className="text-center">
                    <h3 className="font-semibold">Leads Only</h3>
                    <p className="text-xs text-muted-foreground mt-1">Contacts who haven't purchased yet.</p>
                </div>
            </Label>

            {/* Smart List (Placeholder) */}
            <Label
                htmlFor="audience-smart"
                className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer opacity-50 cursor-not-allowed",
                    selection.type === 'smart_list' && "border-primary bg-accent"
                )}
            // onClick={() => onChange({ type: 'smart_list' })} // Disabled for now
            >
                <ListFilter className="mb-3 h-6 w-6" />
                <div className="text-center">
                    <h3 className="font-semibold">Smart List</h3>
                    <p className="text-xs text-muted-foreground mt-1">Target specific segments (Coming Soon)</p>
                </div>
            </Label>

        </div>
    )
}
