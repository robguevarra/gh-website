'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getAllTagsAction, bulkAssignTagsAction, bulkRemoveTagsAction } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Loader2, Tag as TagIcon, Check, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface BulkTagDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedUserIds: string[]
    mode: 'add' | 'remove'
}

export function BulkTagDialog({ open, onOpenChange, selectedUserIds, mode }: BulkTagDialogProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const queryClient = useQueryClient()

    const { data } = useQuery({
        queryKey: ['all-tags'],
        queryFn: () => getAllTagsAction(),
        enabled: open
    })

    const tags = data?.tags || []

    const mutation = useMutation({
        mutationFn: async () => {
            if (mode === 'add') {
                return await bulkAssignTagsAction(selectedUserIds, selectedTags)
            } else {
                return await bulkRemoveTagsAction(selectedUserIds, selectedTags)
            }
        },
        onSuccess: (result) => {
            if (!result.success) throw new Error(result.error)

            toast.success(result.message)
            queryClient.invalidateQueries({ queryKey: ['directory'] }) // Refresh directory to show new tags
            onOpenChange(false)
            setSelectedTags([])
        },
        onError: (error) => toast.error(error.message)
    })

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        )
    }

    // Filter out system tags for modification if needed, or simply let the backend reject them.
    // Ideally we filter them out so users can't select them (especially for Add/Remove if manually restricted).
    // The backend `assignTagsToUsers` throws if system tag is used. So we should visually disable them.
    const validTags = tags.filter(t => !t.is_system)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{mode === 'add' ? 'Add Tags' : 'Remove Tags'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'add'
                            ? `Apply tags to ${selectedUserIds.length} selected contacts.`
                            : `Remove tags from ${selectedUserIds.length} selected contacts.`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="border rounded-md p-2 h-60 overflow-y-auto flex flex-wrap gap-2 content-start">
                        {validTags.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                                No available tags.
                            </div>
                        ) : validTags.map(tag => {
                            const isSelected = selectedTags.includes(tag.id)
                            return (
                                <Badge
                                    key={tag.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className={cn(
                                        "cursor-pointer hover:bg-primary/90 transition-colors h-8 px-3 text-sm flex items-center gap-1",
                                        isSelected ? "hover:bg-primary/80" : "hover:bg-secondary"
                                    )}
                                    onClick={() => toggleTag(tag.id)}
                                >
                                    {isSelected && <Check className="h-3 w-3" />}
                                    {tag.name}
                                </Badge>
                            )
                        })}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => mutation.mutate()}
                            disabled={selectedTags.length === 0 || mutation.isPending}
                        >
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'add' ? 'Apply Tags' : 'Remove Tags'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
