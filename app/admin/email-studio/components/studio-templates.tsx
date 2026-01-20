'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Copy, Trash2, FileCode, MoreHorizontal, LayoutTemplate, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { TemplateEditor } from './templates/template-editor'
import { getTemplates, deleteTemplate } from '../actions'

interface Template {
    id: string
    name: string
    category: string
    subject?: string
    updated_at: string
    design?: any
    html_content?: string
}

export function StudioTemplates() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list')
    const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(undefined)
    const [searchQuery, setSearchQuery] = useState('')

    const fetchTemplates = async () => {
        setIsLoading(true)
        const { templates, error } = await getTemplates()
        if (error) {
            toast.error("Failed to load templates")
        } else {
            setTemplates(templates || [])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    const handleCreate = () => {
        setEditingTemplate(undefined)
        setViewMode('editor')
    }

    const handleEdit = (template: Template) => {
        setEditingTemplate(template)
        setViewMode('editor')
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this template?')) return

        const { success, error } = await deleteTemplate(id)
        if (success) {
            toast.success('Template deleted')
            setTemplates(prev => prev.filter(t => t.id !== id))
        } else {
            toast.error(error || 'Failed to delete')
        }
    }

    const handleDuplicate = async (template: Template, e: React.MouseEvent) => {
        e.stopPropagation()
        // For now, easier to just load it into editor as new
        setEditingTemplate({ ...template, id: '', name: `${template.name} (Copy)` })
        setViewMode('editor')
        toast.info('Opened copy in editor. Save to create.')
    }

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (viewMode === 'editor') {
        return (
            <TemplateEditor
                template={editingTemplate}
                onBack={() => setViewMode('list')}
                onSave={() => {
                    setViewMode('list')
                    fetchTemplates()
                }}
            />
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-medium">My Templates</h3>
                    <div className="relative w-[300px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            className="pl-9 bg-background/50 border-dashed focus:border-solid transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <Button onClick={handleCreate} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                </Button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[240px] w-full rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New - Ghost Card */}
                    <div
                        onClick={handleCreate}
                        className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/50 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer h-[280px]"
                    >
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-background shadow-sm transition-all">
                            <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground">New Template</h3>
                        <p className="text-sm text-muted-foreground text-center mt-1 px-4">Start from scratch using the visual builder.</p>
                    </div>

                    {/* Template Cards */}
                    {filteredTemplates.map((template) => (
                        <Card
                            key={template.id}
                            onClick={() => handleEdit(template)}
                            className="overflow-hidden group hover:shadow-lg hover:border-primary/40 transition-all border-border/60 bg-card h-[280px] flex flex-col cursor-pointer relative"
                        >
                            <CardHeader className="p-0 h-[150px] bg-muted/10 relative border-b border-border/40">
                                {/* HTML Preview or Placeholder */}
                                <div className="absolute inset-0 flex items-center justify-center bg-dots-pattern opacity-50">
                                    <LayoutTemplate className="h-12 w-12 text-muted-foreground/30" />
                                </div>
                                <div className="absolute inset-0 bg-white" style={{ zoom: 0.25, pointerEvents: 'none', overflow: 'hidden' }}>
                                    {template.html_content && (
                                        <div dangerouslySetInnerHTML={{ __html: template.html_content }} className="w-[400%] h-[400%]" />
                                    )}
                                </div>

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                    <Button size="sm" variant="secondary" className="h-9 px-4 font-medium shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform">
                                        <Edit className="mr-2 h-3.5 w-3.5" /> Edit Design
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 flex-1 flex flex-col">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div>
                                            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider block mb-0.5">Template Name</span>
                                            <h4 className="font-bold truncate text-base tracking-tight text-foreground" title={template.name}>{template.name}</h4>
                                        </div>

                                        <div>
                                            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider block mb-0.5">Subject</span>
                                            <p className="text-sm font-medium text-foreground/80 truncate" title={template.subject}>{template.subject || <span className="italic text-muted-foreground/60">No subject</span>}</p>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={(e) => handleDuplicate(template, e)}>
                                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleDelete(template.id, e)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                            <CardFooter className="p-5 pt-0 text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider flex justify-between mt-auto">
                                <span>Updated {format(new Date(template.updated_at), 'MMM d, yyyy')}</span>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
