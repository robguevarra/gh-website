'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getAllTagsAction, createTagAction, updateTagAction, deleteTagAction } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, Loader2, Tag as TagIcon, Lock } from "lucide-react"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function TagManagerDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    // Form Stats
    const [tagName, setTagName] = useState("")
    const [tagDescription, setTagDescription] = useState("")

    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['all-tags'],
        queryFn: () => getAllTagsAction(),
        enabled: isOpen
    })

    const tags = data?.tags || []

    const resetForm = () => {
        setTagName("")
        setTagDescription("")
        setIsCreating(false)
        setEditingId(null)
    }

    const createMutation = useMutation({
        mutationFn: async () => {
            const result = await createTagAction(tagName, tagDescription)
            if (!result.success) throw new Error(result.error)
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-tags'] })
            toast.success("Tag created successfully")
            resetForm()
        },
        onError: (error) => toast.error(error.message)
    })

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingId) return
            const result = await updateTagAction(editingId, tagName, tagDescription)
            if (!result.success) throw new Error(result.error)
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-tags'] })
            toast.success("Tag updated successfully")
            resetForm()
        },
        onError: (error) => toast.error(error.message)
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await deleteTagAction(id)
            if (!result.success) throw new Error(result.error)
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-tags'] })
            toast.success("Tag deleted successfully")
        },
        onError: (error) => toast.error(error.message)
    })

    const handleEdit = (tag: any) => {
        setEditingId(tag.id)
        setTagName(tag.name)
        setTagDescription(tag.metadata?.description || "")
        setIsCreating(true)
    }

    const handleSubmit = () => {
        if (!tagName.trim()) return

        if (editingId) {
            updateMutation.mutate()
        } else {
            createMutation.mutate()
        }
    }

    const filteredTags = tags.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <TagIcon className="mr-2 h-4 w-4" />
                    Manage Tags
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Tag Management</DialogTitle>
                    <DialogDescription>
                        Create, edit, and manage tags for your directory.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 flex-1 min-h-0">
                    {/* Toolbar */}
                    <div className="flex gap-2 items-center justify-between">
                        <Input
                            placeholder="Search tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-[300px]"
                        />
                        {!isCreating && (
                            <Button onClick={() => setIsCreating(true)} size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                New Tag
                            </Button>
                        )}
                    </div>

                    {/* Create/Edit Form */}
                    {isCreating && (
                        <div className="border rounded-md p-4 bg-muted/30 espacio-y-3">
                            <h3 className="font-medium text-sm mb-2">{editingId ? 'Edit Tag' : 'Create New Tag'}</h3>
                            <div className="grid gap-3">
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Name</label>
                                    <Input
                                        value={tagName}
                                        onChange={(e) => setTagName(e.target.value)}
                                        placeholder="e.g. VIP Customer"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Description</label>
                                    <Textarea
                                        value={tagDescription}
                                        onChange={(e) => setTagDescription(e.target.value)}
                                        placeholder="Optional description..."
                                        className="h-20"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSubmit}
                                        disabled={!tagName || createMutation.isPending || updateMutation.isPending}
                                    >
                                        {(createMutation.isPending || updateMutation.isPending) && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {editingId ? 'Update' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tags List */}
                    <div className="border rounded-md flex-1 overflow-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading tags...
                            </div>
                        ) : filteredTags.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No tags found.
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredTags.map(tag => (
                                    <div key={tag.id} className="flex items-center justify-between p-3 hover:bg-muted/50 group">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{tag.name}</span>
                                                {tag.is_system && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                                                        <Lock className="h-3 w-3" /> System
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px] h-5">
                                                    {tag.user_count || 0} users
                                                </Badge>
                                            </div>
                                            {tag.metadata?.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {tag.metadata.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                            {tag.is_system ? (
                                                <span className="text-xs text-muted-foreground mr-2">Protected</span>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleEdit(tag)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete <strong>{tag.name}</strong>?
                                                                    This will remove the tag from all users who have it. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    onClick={() => deleteMutation.mutate(tag.id)}
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
