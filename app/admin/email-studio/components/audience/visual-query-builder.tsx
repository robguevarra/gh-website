'use client'

import { useState } from 'react'
import { Condition, GroupCondition, OperatorType, SegmentRules, TagCondition } from '@/lib/segmentation/engine'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, Trash2, Layers, Tag as TagIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tag } from '@/lib/supabase/data-access/tags'

interface VisualQueryBuilderProps {
    rules: SegmentRules
    onChange: (rules: SegmentRules) => void
    availableTags: Tag[]
}

// Helper to generate a consistent color from a string
const getTagColor = (name: string) => {
    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

export function VisualQueryBuilder({ rules, onChange, availableTags }: VisualQueryBuilderProps) {

    const updateRootOperator = (op: OperatorType) => {
        onChange({ ...rules, operator: op })
    }

    const addCondition = (condition: Condition) => {
        onChange({
            ...rules,
            conditions: [...rules.conditions, condition]
        })
    }

    const updateCondition = (index: number, newCondition: Condition) => {
        const newConditions = [...rules.conditions]
        newConditions[index] = newCondition
        onChange({ ...rules, conditions: newConditions })
    }

    const removeCondition = (index: number) => {
        const newConditions = rules.conditions.filter((_, i) => i !== index)
        onChange({ ...rules, conditions: newConditions })
    }

    return (
        <div className="space-y-4">
            <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
                {/* Root Logic Header */}
                <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Layers className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Match users where</span>

                        <Select
                            value={rules.operator}
                            onValueChange={(v) => updateRootOperator(v as OperatorType)}
                        >
                            <SelectTrigger className="w-[100px] h-8 bg-white dark:bg-zinc-900 border-dashed">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AND">ALL match</SelectItem>
                                <SelectItem value="OR">ANY match</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm font-medium">of the following:</span>
                    </div>
                </div>

                {/* Conditions Canvas */}
                <div className="p-6 space-y-4 bg-dots-pattern">
                    {rules.conditions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl border-muted">
                            <p className="text-sm text-muted-foreground mb-4">Start by adding a filter</p>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => addCondition({ type: 'tag', tagId: '' })}>
                                    <TagIcon className="mr-2 h-3.5 w-3.5" />
                                    Add Tag
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => addCondition({ type: 'group', operator: 'AND', conditions: [] })}>
                                    <Layers className="mr-2 h-3.5 w-3.5" />
                                    Add Group
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 relative">
                            {/* Connector Line for visual hierarchy if multiple items */}
                            {rules.conditions.length > 1 && (
                                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border -z-10" />
                            )}

                            {rules.conditions.map((condition, idx) => (
                                <ConditionBlock
                                    key={idx}
                                    condition={condition}
                                    onChange={(c) => updateCondition(idx, c)}
                                    onRemove={() => removeCondition(idx)}
                                    availableTags={availableTags}
                                />
                            ))}

                            {/* Add Button at bottom of list */}
                            <div className="pt-2 pl-2 flex gap-2">
                                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-primary" onClick={() => addCondition({ type: 'tag', tagId: '' })}>
                                    <Plus className="mr-1 h-3 w-3" /> Add Tag
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-primary" onClick={() => addCondition({ type: 'group', operator: 'AND', conditions: [] })}>
                                    <Plus className="mr-1 h-3 w-3" /> Add Group
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Recursive Block Component
function ConditionBlock({ condition, onChange, onRemove, availableTags }: { condition: Condition, onChange: (c: Condition) => void, onRemove: () => void, availableTags: Tag[] }) {

    if (condition.type === 'tag') {
        const tagCond = condition as TagCondition
        return (
            <div className="group relative flex items-center gap-3 bg-card p-3 rounded-lg border shadow-sm hover:shadow-md transition-all hover:border-primary/20">
                {/* Drag Handle or Icon */}
                <div className="h-2 w-2 rounded-full bg-border group-hover:bg-primary transition-colors" />

                <span className="text-sm font-medium text-muted-foreground">Tag is</span>

                <Select
                    value={tagCond.tagId}
                    onValueChange={(val) => onChange({ ...tagCond, tagId: val })}
                >
                    <SelectTrigger className="min-w-[180px] h-8 border-none bg-muted/50 hover:bg-muted transition-colors">
                        <SelectValue placeholder="Select a tag..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableTags.map(tag => (
                            <SelectItem key={tag.id} value={tag.id}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("h-2 w-2 rounded-full", getTagColor(tag.name))} />
                                    {tag.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    if (condition.type === 'group') {
        const groupCond = condition as GroupCondition
        // Recursive Call
        return (
            <div className="group relative border border-dashed border-border rounded-lg bg-muted/5 pl-4 py-3 pr-3">
                <div className="absolute left-[-1px] top-4 w-1 h-full bg-transparent group-hover:bg-primary/20 transition-colors" />

                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase bg-background">Group</Badge>
                        <Select
                            value={groupCond.operator}
                            onValueChange={(v) => onChange({ ...groupCond, operator: v as OperatorType })}
                        >
                            <SelectTrigger className="w-[80px] h-7 text-xs border-none shadow-none bg-transparent p-0 hover:bg-muted/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onRemove}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>

                <div className="space-y-2 pl-2 border-l border-border/50 ml-1">
                    {groupCond.conditions.map((child, idx) => (
                        <ConditionBlock
                            key={idx}
                            condition={child}
                            onChange={(updated) => {
                                const newConds = [...groupCond.conditions]
                                newConds[idx] = updated
                                onChange({ ...groupCond, conditions: newConds })
                            }}
                            onRemove={() => {
                                const newConds = groupCond.conditions.filter((_, i) => i !== idx)
                                onChange({ ...groupCond, conditions: newConds })
                            }}
                            availableTags={availableTags}
                        />
                    ))}

                    <div className="pt-2 flex gap-2">
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => {
                            onChange({ ...groupCond, conditions: [...groupCond.conditions, { type: 'tag', tagId: '' }] })
                        }}>
                            + Tag
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => {
                            onChange({ ...groupCond, conditions: [...groupCond.conditions, { type: 'group', operator: 'AND', conditions: [] }] })
                        }}>
                            + Group
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
