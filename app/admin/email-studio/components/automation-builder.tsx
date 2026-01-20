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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Save, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TriggerNode } from './nodes/trigger-node'
import { ActionNode } from './nodes/action-node'
import { ConditionNode } from './nodes/condition-node'

import { PropertyPanel } from './property-panel'

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    condition: ConditionNode,
}

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'trigger',
        data: { label: 'Trigger: Checkout Abandoned', event: 'checkout_abandoned' },
        position: { x: 250, y: 50 },
    },
]

const initialEdges: Edge[] = []

import { toast } from 'sonner'
import { saveAutomationGraph, getTemplates, getCampaigns } from '../actions'

interface AutomationBuilderProps {
    automationId: string
    initialGraph?: any
}

export function AutomationBuilder({ automationId, initialGraph }: AutomationBuilderProps) {
    const [nodes, setNodes] = useState<Node[]>(initialGraph?.nodes || initialNodes)
    const [edges, setEdges] = useState<Edge[]>(initialGraph?.edges || initialEdges)
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [templates, setTemplates] = useState<any[]>([])
    const [campaigns, setCampaigns] = useState<any[]>([])
    const router = useRouter()

    useEffect(() => {
        const fetchData = async () => {
            const { templates } = await getTemplates()
            if (templates) setTemplates(templates)

            const { campaigns } = await getCampaigns()
            if (campaigns) setCampaigns(campaigns)
        }
        fetchData()
    }, [])

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

    // Handle node click to open property panel
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNode(node)
    }, [])

    // Handle background click to deselect
    const onPaneClick = useCallback(() => {
        setSelectedNode(null)
    }, [])

    const handleNodeUpdate = (id: string, newData: any) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                // If label changed, update it. If specific field changed, update it.
                return { ...node, data: newData }
            }
            return node
        }))
        // Update selected node reference to keep panel in sync
        setSelectedNode((prev) => prev?.id === id ? { ...prev, data: newData } as Node : prev)
    }

    const handleNodeDelete = (id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id))
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
        setSelectedNode(null)
    }

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()

            const type = event.dataTransfer.getData('application/reactflow')
            const label = event.dataTransfer.getData('application/reactflow/label')
            const actionType = event.dataTransfer.getData('application/reactflow/actionType')

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return
            }

            // projected position from screen to flow
            // Note: We need a ref to the react flow instance to do screenToFlowPosition correctly, 
            // but for now simple offset is okay or we add ReactFlowProvider wrapper. SImplified for now.
            const position = {
                x: event.clientX - 300, // Approximate offset for sidebar
                y: event.clientY - 100,
            }

            const newNode: Node = {
                id: crypto.randomUUID(),
                type,
                position,
                data: { label: label, actionType: actionType },
            }

            setNodes((nds) => nds.concat(newNode))
        },
        [setNodes],
    )

    const handleSave = async () => {
        setIsSaving(true)
        const graph = { nodes, edges }
        const { error } = await saveAutomationGraph(automationId, graph)

        if (error) {
            toast.error("Failed to save flow")
        } else {
            toast.success("Flow saved successfully")
        }
        setIsSaving(false)
    }

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between mb-4 px-4 py-2 bg-white border-b">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-xl font-bold">Automation Builder</h1>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Flow"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden border rounded-lg bg-slate-50 relative">
                {/* Sidebar Palette */}
                <aside className="w-64 bg-white border-r p-4 flex flex-col gap-4 z-10">
                    <div className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Nodes</div>

                    <div
                        className="p-3 bg-emerald-50 border border-emerald-200 rounded cursor-grab flex items-center gap-2 hover:shadow-md transition-shadow"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'trigger')
                            event.dataTransfer.setData('application/reactflow/label', 'New Trigger')
                            event.dataTransfer.effectAllowed = 'move'
                        }}
                        draggable
                    >
                        <div className="bg-emerald-500 w-2 h-2 rounded-full" />
                        <span className="text-sm font-medium">Trigger</span>
                    </div>

                    <div
                        className="p-3 bg-blue-50 border border-blue-200 rounded cursor-grab flex items-center gap-2 hover:shadow-md transition-shadow"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'action')
                            event.dataTransfer.setData('application/reactflow/label', 'Send Email')
                            event.dataTransfer.setData('application/reactflow/actionType', 'email')
                            event.dataTransfer.effectAllowed = 'move'
                        }}
                        draggable
                    >
                        <div className="bg-blue-500 w-2 h-2 rounded-full" />
                        <span className="text-sm font-medium">Send Email</span>
                    </div>

                    <div
                        className="p-3 bg-pink-50 border border-pink-200 rounded cursor-grab flex items-center gap-2 hover:shadow-md transition-shadow"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'action')
                            event.dataTransfer.setData('application/reactflow/label', 'Add Tag')
                            event.dataTransfer.setData('application/reactflow/actionType', 'tag')
                            event.dataTransfer.effectAllowed = 'move'
                        }}
                        draggable
                    >
                        <div className="bg-pink-500 w-2 h-2 rounded-full" />
                        <span className="text-sm font-medium">Add Tag</span>
                    </div>

                    <div
                        className="p-3 bg-orange-50 border border-orange-200 rounded cursor-grab flex items-center gap-2 hover:shadow-md transition-shadow"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'condition')
                            event.dataTransfer.setData('application/reactflow/label', 'Condition (If/Else)')
                            event.dataTransfer.effectAllowed = 'move'
                        }}
                        draggable
                    >
                        <div className="bg-orange-500 w-2 h-2 rounded-full" />
                        <span className="text-sm font-medium">Condition</span>
                    </div>

                    <div
                        className="p-3 bg-purple-50 border border-purple-200 rounded cursor-grab flex items-center gap-2 hover:shadow-md transition-shadow"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'action')
                            event.dataTransfer.setData('application/reactflow/label', 'Delay')
                            event.dataTransfer.setData('application/reactflow/actionType', 'delay')
                            event.dataTransfer.effectAllowed = 'move'
                        }}
                        draggable
                    >
                        <div className="bg-purple-500 w-2 h-2 rounded-full" />
                        <span className="text-sm font-medium">Delay</span>
                    </div>

                    <div
                        className="p-3 bg-indigo-50 border border-indigo-200 rounded cursor-grab flex items-center gap-2 hover:shadow-md transition-shadow"
                        onDragStart={(event) => {
                            event.dataTransfer.setData('application/reactflow', 'action')
                            event.dataTransfer.setData('application/reactflow/label', 'Wait Until')
                            event.dataTransfer.setData('application/reactflow/actionType', 'wait_event')
                            event.dataTransfer.effectAllowed = 'move'
                        }}
                        draggable
                    >
                        <div className="bg-indigo-500 w-2 h-2 rounded-full" />
                        <span className="text-sm font-medium">Wait Until</span>
                    </div>

                </aside>

                {/* Canvas */}
                <div className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>

                    {/* Property Panel Overlay */}
                    <div className="absolute top-0 right-0 h-full pointer-events-none">
                        <div className="pointer-events-auto h-full">
                            {selectedNode && (
                                <PropertyPanel
                                    node={selectedNode}
                                    onChange={handleNodeUpdate}
                                    onClose={() => setSelectedNode(null)}
                                    onDelete={handleNodeDelete}
                                    templates={templates}
                                    campaigns={campaigns}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
