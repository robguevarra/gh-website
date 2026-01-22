'use client'

import { Node } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { X, Trash2 } from 'lucide-react'

interface PropertyPanelProps {
    node: Node | null
    onChange: (id: string, data: any) => void
    onClose: () => void
    onDelete: (id: string) => void
    templates?: any[]
    campaigns?: any[]
    tags?: any[]
}

export function PropertyPanel({ node, onChange, onClose, onDelete, templates = [], campaigns = [], tags = [] }: PropertyPanelProps) {
    if (!node) return null

    const handleChange = (key: string, value: any) => {
        onChange(node.id, { ...node.data, [key]: value })
    }

    return (
        <aside className="w-80 bg-white border-l h-full flex flex-col shadow-xl z-20 absolute right-0 top-0 bottom-0 animate-in slide-in-from-right-10 duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                <h3 className="font-semibold text-sm uppercase tracking-wide">Configure Node</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Common Fields */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Label</Label>
                    <Input
                        value={node.data.label as string || ''}
                        onChange={(e) => handleChange('label', e.target.value)}
                    />
                </div>

                <Separator />

                {/* Type Specific Fields */}

                {(node.type === 'trigger' || (node.type === 'funnelNode' && node.data.actionType === 'trigger')) && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Event Trigger</Label>
                            <Select
                                value={(node.data.event as string) || 'checkout_abandoned'}
                                onValueChange={(val) => handleChange('event', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="text-xs font-semibold text-slate-500 px-2 py-1.5 uppercase tracking-wider">Commerce</div>
                                    <SelectItem value="checkout.started">Checkout Started (Abandoned)</SelectItem>
                                    <SelectItem value="checkout.completed">Checkout Completed (Purchase)</SelectItem>

                                    <div className="text-xs font-semibold text-slate-500 px-2 py-1.5 uppercase tracking-wider border-t mt-1 pt-2">Engagement</div>
                                    <SelectItem value="email_clicked">Campaign Clicked</SelectItem>

                                    <div className="text-xs font-semibold text-slate-500 px-2 py-1.5 uppercase tracking-wider border-t mt-1 pt-2">System</div>
                                    <SelectItem value="tag_added">Tag Added</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Trigger Filters */}
                            {node.data.event === 'tag_added' && (
                                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                                    <Label className="text-xs">Which Tag?</Label>
                                    <Select
                                        value={(node.data.filterTag as string) || 'any'}
                                        onValueChange={(val) => handleChange('filterTag', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select tag..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">Any Tag</SelectItem>
                                            {tags.map((t) => (
                                                <SelectItem key={t.id} value={t.name}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground mt-1">Run only for specific tags.</p>
                                </div>
                            )}

                            {node.data.event === 'email_clicked' && (
                                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                                    <Label className="text-xs">Which Campaign?</Label>
                                    <Select
                                        value={(node.data.filterCampaign as string) || ''}
                                        onValueChange={(val) => handleChange('filterCampaign', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select campaign..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">Any Campaign</SelectItem>
                                            {campaigns.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.subject || c.name || 'Untitled Campaign'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground mt-1">Run only for a specific email blast.</p>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                                This automation starts when this event occurs.
                            </p>
                        </div>

                        {/* Product Type Filter - Separated Block */}
                        {(node.data.event === 'checkout.started' || node.data.event === 'checkout.completed') && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 border-t pt-4">
                                <Label>Product Type</Label>
                                <Select
                                    value={(node.data.filterProductType as string) || 'any'}
                                    onValueChange={(val) => handleChange('filterProductType', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Any Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any Product</SelectItem>
                                        <SelectItem value="P2P">P2P Course</SelectItem>
                                        <SelectItem value="Canva">Canva Ebook</SelectItem>
                                        <SelectItem value="SHOPIFY_ECOM">Public Shop</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Run only for specific product types.</p>
                            </div>
                        )}
                    </div>
                )}

                {((node.type === 'action' || node.type === 'funnelNode') && node.data.actionType === 'email') && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email Subject</Label>
                            <Input
                                placeholder="e.g. You forgot something!"
                                value={(node.data.subject as string) || ''}
                                onChange={(e) => handleChange('subject', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Template</Label>
                            <Select
                                value={(node.data.templateId as string) || ''}
                                onValueChange={(val) => {
                                    handleChange('templateId', val)
                                    // Also auto-fill subject if empty? Optional but nice.
                                    // const tpl = templates.find(t => t.id === val)
                                    // if (tpl && !node.data.subject) handleChange('subject', tpl.subject)
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Select the email design to send.</p>
                        </div>
                    </div>
                )}

                {((node.type === 'action' || node.type === 'funnelNode') && node.data.actionType === 'tag') && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tag Name</Label>
                            <Select
                                value={(node.data.tagName as string) || ''}
                                onValueChange={(val) => handleChange('tagName', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tag..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {tags.map((t) => (
                                        <SelectItem key={t.id} value={t.name}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {((node.type === 'action' || node.type === 'funnelNode') && node.data.actionType === 'delay') && (
                    <div className="space-y-4">
                        <div className="space-y-2 flex gap-2">
                            <div className="flex-1">
                                <Label>Duration</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={(node.data.delayValue as number) || 1}
                                    onChange={(e) => handleChange('delayValue', parseInt(e.target.value))}
                                />
                            </div>
                            <div className="w-1/3">
                                <Label>Unit</Label>
                                <Select
                                    value={(node.data.delayUnit as string) || 'days'}
                                    onValueChange={(val) => handleChange('delayUnit', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="minutes">Mins</SelectItem>
                                        <SelectItem value="hours">Hours</SelectItem>
                                        <SelectItem value="days">Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {((node.type === 'action' || node.type === 'funnelNode') && node.data.actionType === 'wait_event') && (
                    <div className="space-y-4">
                        <div className="p-3 bg-indigo-50 rounded text-xs text-indigo-800 border border-indigo-200">
                            Pauses the flow until this event occurs, or the timeout is reached.
                        </div>
                        <div className="space-y-2">
                            <Label>Wait For Event</Label>
                            <Select
                                value={(node.data.event as string) || 'email_opened'}
                                onValueChange={(val) => handleChange('event', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="email_opened">Email Opened</SelectItem>
                                    <SelectItem value="link_clicked">Link Clicked</SelectItem>
                                    <SelectItem value="order_placed">Order Placed</SelectItem>
                                    <SelectItem value="custom">Custom Event...</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Timeout (Max Wait)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min="1"
                                    value={(node.data.delayValue as number) || 1}
                                    onChange={(e) => handleChange('delayValue', parseInt(e.target.value))}
                                    className="flex-1"
                                />
                                <Select
                                    value={(node.data.delayUnit as string) || 'days'}
                                    onValueChange={(val) => handleChange('delayUnit', val)}
                                >
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="minutes">Mins</SelectItem>
                                        <SelectItem value="hours">Hours</SelectItem>
                                        <SelectItem value="days">Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-xs text-muted-foreground">If event doesn't happen by then, flow continues.</p>
                        </div>
                    </div>
                )}

                {node.type === 'condition' && (
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-50 rounded text-xs text-amber-800 border border-amber-200">
                            Condition logic checks a field against a value.
                        </div>
                        <div className="space-y-2">
                            <Label>Field</Label>
                            <Select
                                value={(node.data.field as string) || 'tags'}
                                onValueChange={(val) => handleChange('field', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tags">Tags</SelectItem>
                                    <SelectItem value="order_count">Order Count</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                                value={(node.data.operator as string) || 'contains'}
                                onValueChange={(val) => handleChange('operator', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="greater_than">Greater Than</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                                placeholder="value to check"
                                value={(node.data.checkValue as string) || ''}
                                onChange={(e) => handleChange('checkValue', e.target.value)}
                            />
                        </div>
                    </div>
                )}

            </div>

            <div className="p-4 border-t bg-slate-50">
                <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => onDelete(node.id)}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Node
                </Button>
            </div>
        </aside>
    )
}
