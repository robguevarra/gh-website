'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2, LayoutTemplate } from 'lucide-react'
import { toast } from 'sonner'
import UnlayerEmailEditor, { EditorRef } from '@/app/admin/email-templates/unlayer-email-editor'
import { createTemplate, updateTemplate } from '../../actions'

interface TemplateEditorProps {
    template?: any // If editing
    onBack: () => void
    onSave: () => void
}

export function TemplateEditor({ template, onBack, onSave }: TemplateEditorProps) {
    const editorRef = useRef<EditorRef>(null)
    const [name, setName] = useState(template?.name || '')
    const [subject, setSubject] = useState(template?.subject || '')
    const [category, setCategory] = useState(template?.category || 'General')
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Please enter a template name')
            return
        }

        setIsSaving(true)
        try {
            // Get design from editor
            editorRef.current?.exportHtml(async (data) => {
                const { design, html } = data

                let result
                if (template?.id) {
                    result = await updateTemplate(template.id, {
                        name,
                        subject,
                        design,
                        html
                    })
                } else {
                    result = await createTemplate({
                        name,
                        category,
                        subject,
                        design,
                        html
                    })
                }

                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success(template ? 'Template updated' : 'Template created')
                    onSave() // Refresh parent
                }
                setIsSaving(false)
            })
        } catch (err) {
            console.error(err)
            setIsSaving(false)
            toast.error('Failed to save template')
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-background border rounded-xl overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur z-10 h-[88px]">
                <div className="flex items-center gap-4 w-full max-w-[800px]">
                    <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 h-10 w-10 shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    <div className="flex flex-col gap-4 flex-1">
                        <div className="flex items-center gap-6">
                            <div className="flex-1 max-w-[400px]">
                                <Label htmlFor="template-name" className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1 block">Template Name</Label>
                                <Input
                                    id="template-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter template name..."
                                    className="h-9 font-bold text-lg border-transparent hover:border-border focus-visible:border-primary px-2 -ml-2 bg-transparent w-full transition-all"
                                />
                            </div>

                            <div className="flex-1">
                                <Label htmlFor="email-subject" className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1 block">Subject</Label>
                                <Input
                                    id="email-subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Email Subject Line (Optional)"
                                    className="h-9 text-sm font-medium border-transparent hover:border-border focus-visible:border-primary px-2 -ml-2 bg-transparent w-full transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-md">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Template
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 bg-muted/10 relative">
                <UnlayerEmailEditor
                    ref={editorRef}
                    initialDesign={template?.design}
                    minHeight="100%"
                />
            </div>
        </div>
    )
}
