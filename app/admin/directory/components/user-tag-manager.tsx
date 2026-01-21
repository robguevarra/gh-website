'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, X, Tag as TagIcon, Check } from "lucide-react"
import { toast } from "sonner"
import { getAllTagsAction, getUserTagsAction, assignTagToUserAction, removeTagFromUserAction } from "../actions"
import { cn } from "@/lib/utils"

interface UserTagManagerProps {
    userId: string
    userName?: string
}

export function UserTagManager({ userId, userName }: UserTagManagerProps) {
    const [open, setOpen] = useState(false)
    const [comboboxOpen, setComboboxOpen] = useState(false)
    const queryClient = useQueryClient()

    // 1. Fetch All Available Tags
    const { data: allTagsData, isLoading: isLoadingAllTags } = useQuery({
        queryKey: ['all-tags'],
        queryFn: () => getAllTagsAction(),
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    })

    const allTags = allTagsData?.tags || []

    // 2. Fetch User's Current Tags
    const { data: userTags = [], isLoading: isLoadingUserTags } = useQuery({
        queryKey: ['user-tags', userId],
        queryFn: () => getUserTagsAction(userId),
        enabled: open
    })

    // 3. Mutations
    const assignMutation = useMutation({
        mutationFn: async (tagId: string) => assignTagToUserAction(userId, [tagId]),
        onSuccess: (data, tagId) => {
            if (data.success) {
                toast.success("Tag assigned")
                queryClient.invalidateQueries({ queryKey: ['user-tags', userId] })
                queryClient.invalidateQueries({ queryKey: ['contact', userId] }) // Refresh parent drawer
            } else {
                toast.error(data.error || "Failed to assign tag")
            }
        },
        onError: () => toast.error("Failed to assign tag")
    })

    const removeMutation = useMutation({
        mutationFn: async (tagId: string) => removeTagFromUserAction(userId, [tagId]),
        onSuccess: (data) => {
            if (data.success) {
                toast.success("Tag removed")
                queryClient.invalidateQueries({ queryKey: ['user-tags', userId] })
                queryClient.invalidateQueries({ queryKey: ['contact', userId] })
            } else {
                toast.error(data.error || "Failed to remove tag")
            }
        },
        onError: () => toast.error("Failed to remove tag")
    })

    const handleSelectTag = (tagId: string) => {
        // Check if already assigned
        if (userTags.some(t => t.id === tagId)) {
            return
        }
        assignMutation.mutate(tagId)
        setComboboxOpen(false)
    }

    const availableTags = allTags.filter(
        tag => !userTags.some(ut => ut.id === tag.id)
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                    <TagIcon className="h-3.5 w-3.5" />
                    Edit Tags
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Tags for {userName || 'User'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Current Tags Area */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium leading-none text-muted-foreground">Assigned Tags</h4>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-4 border rounded-md bg-muted/20">
                            {isLoadingUserTags ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : userTags.length === 0 ? (
                                <span className="text-sm text-muted-foreground italic">No tags assigned.</span>
                            ) : (
                                userTags.map(tag => (
                                    <Badge key={tag.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                        {tag.name}
                                        <button
                                            onClick={() => removeMutation.mutate(tag.id)}
                                            disabled={removeMutation.isPending}
                                            className="ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                            <span className="sr-only">Remove {tag.name}</span>
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add Tag Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none text-muted-foreground">Add Tag</label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    className="w-full justify-between"
                                    disabled={isLoadingAllTags}
                                >
                                    {isLoadingAllTags ? "Loading tags..." : "Select a tag..."}
                                    <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[450px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search tags..." />
                                    <CommandList>
                                        <CommandEmpty>No tags found.</CommandEmpty>
                                        <CommandGroup>
                                            {availableTags.map((tag) => (
                                                <CommandItem
                                                    key={tag.id}
                                                    value={tag.name}
                                                    onSelect={() => handleSelectTag(tag.id)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            "opacity-0" // Always hidden since we filter out assigned ones, but keeping structure
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span>{tag.name}</span>
                                                        {tag.tag_type && (
                                                            <span className="text-[10px] text-muted-foreground">{tag.tag_type.name}</span>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
