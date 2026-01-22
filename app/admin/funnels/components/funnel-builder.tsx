'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Save, ArrowLeft, Loader2, MousePointerClick, Clock, Mail, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FunnelNode } from './nodes/funnel-node'
import { PropertyPanel } from '@/app/admin/email-studio/components/property-panel' // Reuse for now, simplify later
import { toast } from 'sonner'
import { saveAutomationGraph, saveFunnelGraph, getTemplates, getCampaigns, getTags } from '@/app/admin/email-studio/actions'

const nodeTypes = {
    funnelNode: FunnelNode,
    // Keep standard types fallback just in case, but primary is funnelNode
}

interface FunnelBuilderProps {
    funnelId: string
    automationId: string
    initialGraph?: any
    steps?: any[]
}

// Initial "Empty State" graph for a funnel
const initialNodes: Node[] = [
    {
        id: 'start',
        type: 'funnelNode',
        data: {
            label: 'Funnel Entry',
            actionType: 'trigger',
            metrics: { entered: 0, completed: 0, converted: 0, revenue: 0 }
        },
        position: { x: 300, y: 50 },
    },
]

export function FunnelBuilder({ funnelId, automationId, initialGraph, steps }: FunnelBuilderProps) {
    // 1. Metrics Merging Logic
    // We map over the saved graph nodes. For each node, we try to find a matching 'step' from the database.
    // If found, we inject the 'metrics' from the database into the node's data.

    const nodesWithMetrics = initialGraph?.nodes?.map((n: Node) => {
        // Find matching step by node_id
        const matchingStep = steps?.find((s: any) => s.node_id === n.id)
        const dbMetrics = matchingStep?.metrics || { entered: 0, completed: 0, converted: 0, revenue: 0 }

        return {
            ...n,
            type: 'funnelNode', // Force usage of our new premium node
            data: {
                ...n.data,
                actionType: n.data.actionType || n.type || 'email',
                metrics: dbMetrics // <--- HYDRATION HAPPENS HERE
            }
        }
    })

    const sanitizedNodes = nodesWithMetrics || initialNodes

    const [nodes, setNodes] = useState<Node[]>(sanitizedNodes)
    const [edges, setEdges] = useState<Edge[]>(initialGraph?.edges || [])
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Data for Property Panel
    const [templates, setTemplates] = useState<any[]>([])
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [tags, setTags] = useState<any[]>([])

    const router = useRouter()

    // Load resources
    useEffect(() => {
        const fetchData = async () => {
            const [t, c, tg] = await Promise.all([getTemplates(), getCampaigns(), getTags()])
            if (t.templates) setTemplates(t.templates)
            if (c.campaigns) setCampaigns(c.campaigns)
            if (tg.tags) setTags(tg.tags)
        }
        fetchData()
    }, [])

    // React Flow Hooks
    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [],
    )
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [],
    )
    const onConnect: OnConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [],
    )
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => setSelectedNode(node), [])
    const onPaneClick = useCallback(() => setSelectedNode(null), [])

    // Node Update Logic (Syncs Property Panel updates to Graph)
    const handleNodeUpdate = (id: string, newData: any) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...newData } }
            }
            return node
        }))
        // Keep selected node updated
        setSelectedNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, ...newData } } as Node : prev)
    }

    const handleNodeDelete = (id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id))
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
        setSelectedNode(null)
    }

    // Drag and Drop Logic
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const [rfInstance, setRfInstance] = useState<any>(null) // Should use ReactFlowInstance type if available

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()
            const actionType = event.dataTransfer.getData('application/funnel/actionType')
            const label = event.dataTransfer.getData('application/funnel/label')

            if (!actionType) return

            // Position calculation using internal ReactFlow projection
            let position = { x: 0, y: 0 }

            if (rfInstance) {
                position = rfInstance.screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY,
                })
            } else {
                // Fallback (approximate)
                position = {
                    x: event.clientX - 350,
                    y: event.clientY - 100,
                }
            }

            const newNode: Node = {
                id: crypto.randomUUID(),
                type: 'funnelNode',
                position,
                data: {
                    label,
                    actionType,
                    metrics: { entered: 0, completed: 0, converted: 0, revenue: 0 } // Init metrics
                },
            }

            setNodes((nds) => nds.concat(newNode))
        },
        [setNodes, rfInstance],
    )

    const handleSave = async () => {
        setIsSaving(true)
        const graph = { nodes, edges }

        // Use specialized save action that syncs to email_funnel_steps
        const { error } = await saveFunnelGraph(funnelId, automationId, graph)

        if (error) {
            toast.error("Failed to save funnel flow")
        } else {
            toast.success("Funnel flow saved & metrics synced")
            router.refresh()
        }
        setIsSaving(false)
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">

            <div className="flex-1 flex overflow-hidden">
                {/* Simplified "Funnel" Palette */}
                <aside className="w-16 lg:w-20 bg-white border-r flex flex-col items-center py-6 gap-6 z-10 shadow-sm">

                    {/* Trigger / Start */}
                    <div
                        className="group flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-full px-2"
                        onDragStart={(e) => {
                            e.dataTransfer.setData('application/funnel/actionType', 'trigger')
                            e.dataTransfer.setData('application/funnel/label', 'Start Trigger')
                        }}
                        draggable
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all">
                            <Zap size={18} />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">Start</span>
                    </div>

                    {/* Send Email */}
                    <div
                        className="group flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-full px-2"
                        onDragStart={(e) => {
                            e.dataTransfer.setData('application/funnel/actionType', 'email')
                            e.dataTransfer.setData('application/funnel/label', 'New Email')
                        }}
                        draggable
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all">
                            <Mail size={18} />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">Email</span>
                    </div>

                    {/* Delay */}
                    <div
                        className="group flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-full px-2"
                        onDragStart={(e) => {
                            e.dataTransfer.setData('application/funnel/actionType', 'delay')
                            e.dataTransfer.setData('application/funnel/label', 'Wait')
                        }}
                        draggable
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all">
                            <Clock size={18} />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">Delay</span>
                    </div>

                    {/* Check Goal / Wait Until */}
                    <div
                        className="group flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-full px-2"
                        onDragStart={(e) => {
                            e.dataTransfer.setData('application/funnel/actionType', 'wait_event')
                            e.dataTransfer.setData('application/funnel/label', 'Check Goal')
                        }}
                        draggable
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all">
                            <MousePointerClick size={18} />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 text-center leading-tight">Check<br />Goal</span>
                    </div>

                </aside>

                {/* Main Canvas */}
                <div className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onInit={setRfInstance}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-slate-50"
                    >
                        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E2E8F0" />
                        <Controls className="!bg-white !border-slate-200 !shadow-sm" />
                    </ReactFlow>

                    {/* Property Panel (Top Right Floating) */}
                    <div className="absolute top-4 right-4 h-[calc(100%-2rem)] z-50 pointer-events-none">
                        <div className="pointer-events-auto h-full flex flex-col gap-2">
                            {/* Save Button Floating */}
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg mb-2"
                            >
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Funnel
                            </Button>

                            {selectedNode && (
                                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 h-full overflow-hidden w-[320px]">
                                    <PropertyPanel
                                        node={selectedNode}
                                        onChange={handleNodeUpdate}
                                        onClose={() => setSelectedNode(null)}
                                        onDelete={handleNodeDelete}
                                        templates={templates}
                                        campaigns={campaigns}
                                        tags={tags}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
