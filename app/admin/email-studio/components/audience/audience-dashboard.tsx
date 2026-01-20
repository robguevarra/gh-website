'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Save, Loader2, Download, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SegmentRules } from '@/lib/segmentation/engine'
import { useTagStore } from '@/lib/hooks/use-tag-store'
import { useSegmentStore } from '@/lib/hooks/use-segment-store'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Real imports
import { VisualQueryBuilder } from './visual-query-builder'
import { LiveAudienceCounter } from './live-audience-counter'
import { SegmentUserPreview } from './segment-user-preview'
import { calculateSegmentReach, exportSegmentUsers } from '../../actions'

export type AudienceViewMode = 'grid' | 'builder'

export function AudienceDashboard() {
    const [viewMode, setViewMode] = useState<AudienceViewMode>('grid')

    // Tag Store Integration
    const { tags, fetchTags } = useTagStore()
    const { segments, fetchSegments, createSegment, updateSegment, isLoadingSegments } = useSegmentStore()

    useEffect(() => {
        fetchTags()
        fetchSegments()
    }, [fetchTags, fetchSegments])

    // Builder State
    const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null)
    const [currentRules, setCurrentRules] = useState<SegmentRules>({
        operator: 'AND',
        conditions: []
    })
    const [estimatedReach, setEstimatedReach] = useState<number | null>(0)
    const [sampleUsers, setSampleUsers] = useState<any[]>([])
    const [isCalculating, setIsCalculating] = useState(false)
    const [totalUsers, setTotalUsers] = useState(0)

    // Save Dialog State
    const [isSaveOpen, setIsSaveOpen] = useState(false)
    const [segmentName, setSegmentName] = useState('')
    const [segmentDesc, setSegmentDesc] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    // Fetch total users on mount
    useEffect(() => {
        let mounted = true
        async function fetchTotal() {
            const { count, sampleUsers: samples } = await calculateSegmentReach({ operator: 'AND', conditions: [] })
            if (mounted) {
                setTotalUsers(count)
                if (currentRules.conditions.length === 0) {
                    setEstimatedReach(count)
                    setSampleUsers(samples || [])
                }
            }
        }
        fetchTotal()
        return () => { mounted = false }
    }, [])

    // Ensure total users is populated if it somehow failed initially but reach is calculated
    useEffect(() => {
        if (totalUsers === 0 && estimatedReach && estimatedReach > 0 && currentRules.conditions.length === 0) {
            setTotalUsers(estimatedReach)
        }
    }, [estimatedReach, totalUsers, currentRules.conditions.length])

    // Real-time reach calculation
    useEffect(() => {
        setIsCalculating(true)

        const timeout = setTimeout(async () => {
            // If no conditions, show total users
            if (currentRules.conditions.length === 0) {
                setEstimatedReach(totalUsers)
                setSampleUsers([]) // Or fetch default samples if needed, but usually empty rules = all users
                const { sampleUsers: samples } = await calculateSegmentReach({ operator: 'AND', conditions: [] })
                setSampleUsers(samples || [])
                setIsCalculating(false)
                return
            }

            const { count, sampleUsers: samples } = await calculateSegmentReach(currentRules)
            setEstimatedReach(count)
            setSampleUsers(samples || [])
            setIsCalculating(false)
        }, 600) // Debounce 600ms

        return () => clearTimeout(timeout)
    }, [currentRules, totalUsers])

    const handleCreateNew = () => {
        // Reset state
        setEditingSegmentId(null)
        setSegmentName('')
        setSegmentDesc('')
        setCurrentRules({ operator: 'AND', conditions: [] })
        setEstimatedReach(totalUsers)
        setViewMode('builder')
    }

    const handleBackToGrid = () => {
        setViewMode('grid')
        // Optional: clear state on back? Keeping it allows re-entering builder with same state.
    }

    const handleOpenSave = () => {
        // Only clear if we are creating new (handled by handleCreateNew), 
        // OR better: rely on current state. 
        // If name is empty and we are NOT editing, maybe suggest default?
        // But for update workflow, preserve existing values.
        if (!editingSegmentId && !segmentName) {
            setSegmentName('')
            setSegmentDesc('')
        }
        setIsSaveOpen(true)
    }

    const handleSaveSegment = async () => {
        if (!segmentName.trim()) {
            toast.error('Please enter a segment name')
            return
        }

        setIsSaving(true)
        try {
            let result;

            if (editingSegmentId) {
                // UPDATE existing
                result = await updateSegment(editingSegmentId, {
                    name: segmentName,
                    description: segmentDesc,
                    rules: currentRules
                })
                if (result) {
                    toast.success('Audience segment updated successfully')
                }
            } else {
                // CREATE new
                result = await createSegment({
                    name: segmentName,
                    description: segmentDesc,
                    rules: currentRules
                })
                if (result) {
                    toast.success('Audience segment created successfully')
                    // Switch to edit mode for the newly created segment
                    setEditingSegmentId(result.id)
                }
            }

            if (result) {
                setIsSaveOpen(false)
                // stay in builder mode, or go back? 
                // Usually nicer to stay so they can keep tweaking or see the result.
                // But users might expect "Save & Close". 
                // Let's stay in builder but update the header title via state updates above.
            } else {
                toast.error('Failed to save segment')
            }
        } catch (error) {
            toast.error('An error occurred while saving')
        } finally {
            setIsSaving(false)
        }
    }

    const handleExportCSV = async () => {
        setIsExporting(true)
        try {
            toast.info('Generating CSV export...', { duration: 2000 })
            const { users, error } = await exportSegmentUsers(currentRules)

            if (error) throw new Error(error)

            if (!users || users.length === 0) {
                toast.warning('No users to export')
                return
            }

            // Generate CSV content
            const headers = ['ID', 'Email', 'Name']
            const csvContent = [
                headers.join(','),
                ...users.map((u: any) => `"${u.id}","${u.email}","${u.name}"`)
            ].join('\n')

            // Create download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `audience_export_${new Date().toISOString().slice(0, 10)}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast.success(`Exported ${users.length} users to CSV`)

        } catch (error) {
            console.error('Export failed:', error)
            toast.error('Failed to export CSV')
        } finally {
            setIsExporting(false)
        }
    }

    const handleLoadSegment = (segment: any) => {
        setEditingSegmentId(segment.id)
        setSegmentName(segment.name)
        setSegmentDesc(segment.description || '')
        setCurrentRules(segment.rules as SegmentRules)
        setViewMode('builder')
    }

    return (
        <div className="relative min-h-[600px] w-full bg-background rounded-xl border border-border/40 overflow-hidden shadow-sm">

            {/* Top Bar - "Linear Style" Glassy Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    {viewMode === 'builder' && (
                        <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8 rounded-full" onClick={handleBackToGrid}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div className="flex flex-col">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                            {viewMode === 'grid' ? 'Audience Studio' : (segmentName || 'New Segment')}
                        </h2>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {viewMode === 'grid' ? 'Manage your smart lists' : 'Define audience rules'}
                        </p>
                    </div>
                </div>

                {viewMode === 'grid' && (
                    <Button
                        onClick={handleCreateNew}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Audience
                    </Button>
                )}

                {viewMode === 'builder' && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Download className="mr-2 h-3.5 w-3.5" />}
                            Export CSV
                        </Button>
                        <Button
                            size="sm"
                            className="bg-primary text-primary-foreground shadow-md"
                            onClick={handleOpenSave}
                            disabled={isSaving}
                        >
                            <Save className="mr-2 h-3.5 w-3.5" />
                            Save Segment
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Content Area with Transitions */}
            <div className="p-6 relative bg-muted/5 min-h-[600px]">
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                        >
                            {isLoadingSegments ? (
                                <div className="flex items-center justify-center p-24">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : segments.length === 0 ? (
                                /* Placeholder Grid */
                                <div className="flex flex-col items-center justify-center p-24 border border-dashed rounded-xl border-border/50 bg-background/50">
                                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Plus className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground">No Audiences Created</h3>
                                    <p className="text-muted-foreground max-w-sm text-center mt-2 mb-6">Start by creating your first segment using the new Visual Builder.</p>
                                    <Button onClick={handleCreateNew} variant="outline">Create Now</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {segments.map((segment) => (
                                        <div
                                            key={segment.id}
                                            onClick={() => handleLoadSegment(segment)}
                                            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/50 bg-background p-6 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                        <Save className="h-5 w-5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg tracking-tight mb-1">{segment.name}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{segment.description || 'No description provided.'}</p>
                                                </div>
                                            </div>
                                            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                                                <span>{new Date(segment.created_at).toLocaleDateString()}</span>
                                                <span className="flex items-center text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Load Segment &rarr;
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="builder"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            {/* Left: Query Builder & User Preview */}
                            <div className="lg:col-span-2 space-y-6">
                                <VisualQueryBuilder
                                    rules={currentRules}
                                    onChange={setCurrentRules}
                                    availableTags={tags} // Pass real tags
                                />

                                {/* User Preview Table */}
                                <SegmentUserPreview
                                    users={sampleUsers}
                                    isLoading={isCalculating}
                                    totalCount={estimatedReach || 0}
                                />
                            </div>

                            {/* Right: Real-time Stats */}
                            <div className="lg:col-span-1">
                                <div className="sticky top-24 space-y-6">
                                    <LiveAudienceCounter
                                        count={estimatedReach}
                                        totalUsers={totalUsers}
                                        isLoading={isCalculating}
                                    />

                                    <div className="p-4 rounded-xl border border-border/50 bg-background/50 text-sm text-muted-foreground space-y-2">
                                        <p className="font-medium text-foreground">Pro Tip</p>
                                        <p>Use the "Export CSV" button to download this entire audience list for use in other tools or for manual review.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Save Dialog */}
            <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Audience Segment</DialogTitle>
                        <DialogDescription>
                            Give your segment a name to easily find it later in your campaigns.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Segment Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. VIP Customers - Spring 2025"
                                value={segmentName}
                                onChange={(e) => setSegmentName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="desc">Description (Optional)</Label>
                            <Textarea
                                id="desc"
                                placeholder="What defines this audience?"
                                value={segmentDesc}
                                onChange={(e) => setSegmentDesc(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSegment} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Segment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
