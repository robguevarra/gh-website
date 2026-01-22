import { Handle, Position } from '@xyflow/react'
import { Mail, Tag, Clock, Target, Users, TrendingDown, DollarSign, CheckCircle } from 'lucide-react'

// Extended data interface for Funnel Node
interface FunnelNodeData {
    label: string
    actionType?: 'email' | 'tag' | 'delay' | 'wait_event' | 'trigger' | 'condition'
    // Action details
    subject?: string
    templateId?: string
    tagName?: string
    delayValue?: number
    delayUnit?: string
    event?: string
    // Analytics (The "Premium" part)
    metrics?: {
        entered: number
        completed: number
        converted: number
        revenue: number
    }
}

export function FunnelNode({ data }: { data: FunnelNodeData }) {
    // 1. Determine Colors & Icons based on type
    const getStyles = () => {
        switch (data.actionType) {
            case 'trigger':
                return {
                    border: 'border-emerald-500',
                    bg: 'bg-emerald-50',
                    headerBg: 'bg-emerald-50',
                    headerBorder: 'border-emerald-100',
                    iconBg: 'bg-emerald-500',
                    text: 'text-emerald-900',
                    icon: <Target size={14} />,
                    label: 'Entry Point'
                }
            case 'email':
                return {
                    border: 'border-accent-blue', // Assuming Tailwind config has this, or use hardcoded
                    bg: 'bg-white',
                    headerBg: 'bg-blue-50',
                    headerBorder: 'border-blue-100',
                    iconBg: 'bg-blue-600',
                    text: 'text-blue-900',
                    icon: <Mail size={14} />,
                    label: 'Send Email'
                }
            case 'delay':
                return {
                    border: 'border-purple-400',
                    bg: 'bg-white',
                    headerBg: 'bg-purple-50',
                    headerBorder: 'border-purple-100',
                    iconBg: 'bg-purple-500',
                    text: 'text-purple-900',
                    icon: <Clock size={14} />,
                    label: 'Time Delay'
                }
            case 'wait_event':
                return {
                    border: 'border-orange-400',
                    bg: 'bg-white',
                    headerBg: 'bg-orange-50',
                    headerBorder: 'border-orange-100',
                    iconBg: 'bg-orange-500',
                    text: 'text-orange-900',
                    icon: <Target size={14} />,
                    label: 'Wait Until'
                }
            case 'tag':
                return {
                    border: 'border-pink-400',
                    bg: 'bg-white',
                    headerBg: 'bg-pink-50',
                    headerBorder: 'border-pink-100',
                    iconBg: 'bg-pink-500',
                    text: 'text-pink-900',
                    icon: <Tag size={14} />,
                    label: 'Add Tag'
                }
            default:
                return {
                    border: 'border-slate-300',
                    bg: 'bg-white',
                    headerBg: 'bg-slate-50',
                    headerBorder: 'border-slate-200',
                    iconBg: 'bg-slate-500',
                    text: 'text-slate-900',
                    icon: <Mail size={14} />,
                    label: 'Action'
                }
        }
    }

    const s = getStyles()
    const metrics = data.metrics || { entered: 0, completed: 0, converted: 0, revenue: 0 }

    // Calculate simple drop-off rate
    // Drop-off = (Entered - Completed) / Entered
    const dropOffRate = metrics.entered > 0
        ? Math.round(((metrics.entered - metrics.completed) / metrics.entered) * 100)
        : 0

    return (
        <div className={`relative group w-[280px] rounded-xl border-2 ${s.border} bg-white shadow-sm hover:shadow-lg transition-all duration-200`}>

            {/* Input Handle */}
            {data.actionType !== 'trigger' && (
                <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white" />
            )}

            {/* Header */}
            <div className={`${s.headerBg} p-3 rounded-t-lg border-b ${s.headerBorder} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className={`${s.iconBg} p-1.5 rounded-md text-white shadow-sm`}>
                        {s.icon}
                    </div>
                    <span className={`font-semibold text-sm ${s.text}`}>
                        {s.label}
                    </span>
                </div>
                {/* Optional: Status Indicator */}
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Active" />
            </div>

            {/* Content Body */}
            <div className="p-4 bg-white">
                <div className="font-medium text-slate-800 mb-1 line-clamp-1">{data.label}</div>

                {data.actionType === 'email' && (
                    <div className="text-xs text-slate-500 line-clamp-2">
                        Subject: <span className="italic">{data.subject || 'Missing subject...'}</span>
                    </div>
                )}
                {data.actionType === 'delay' && (
                    <div className="text-xs text-slate-500">
                        Wait for <span className="font-semibold text-slate-700">{data.delayValue} {data.delayUnit}</span>
                    </div>
                )}
            </div>

            {/* Analytics Footer (The Metric Overlay) */}
            <div className="bg-slate-50 border-t border-slate-100 p-2 rounded-b-xl grid grid-cols-3 divide-x divide-slate-200 text-center">

                {/* 1. Entered / Active */}
                <div className="flex flex-col items-center justify-center p-1">
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">In</span>
                    <div className="flex items-center gap-1 text-slate-700 font-mono text-sm">
                        <Users size={12} className="text-blue-500" />
                        {new Intl.NumberFormat('en', { notation: "compact" }).format(metrics.entered)}
                    </div>
                </div>

                {/* 2. Success / Revenue */}
                <div className="flex flex-col items-center justify-center p-1">
                    {metrics.revenue > 0 ? (
                        <>
                            <span className="text-[10px] uppercase text-green-500 font-bold tracking-wider">Rev</span>
                            <div className="flex items-center gap-1 text-green-700 font-mono text-sm font-bold">
                                {/* <DollarSign size={12} /> */}
                                ₱{new Intl.NumberFormat('en', { notation: "compact" }).format(metrics.revenue)}
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Done</span>
                            <div className="flex items-center gap-1 text-slate-700 font-mono text-sm">
                                <CheckCircle size={12} className="text-green-500" />
                                {new Intl.NumberFormat('en', { notation: "compact" }).format(metrics.completed)}
                            </div>
                        </>
                    )}
                </div>

                {/* 3. Drop-off Rate */}
                <div className="flex flex-col items-center justify-center p-1">
                    <span className="text-[10px] uppercase text-red-400 font-bold tracking-wider">Drop</span>
                    <div className="flex items-center gap-1 text-slate-700 font-mono text-sm">
                        <TrendingDown size={12} className="text-red-500" />
                        {dropOffRate}%
                    </div>
                </div>
            </div>

            {/* Output Handle */}
            <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white" />
        </div>
    )
}
