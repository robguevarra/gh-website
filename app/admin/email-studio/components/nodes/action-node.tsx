import { Handle, Position } from '@xyflow/react'
import { Mail, Tag, Clock } from 'lucide-react'

export function ActionNode({ data }: { data: { label: string, actionType?: 'email' | 'tag' | 'delay' | 'wait_event', subject?: string, templateId?: string, tagName?: string, delayValue?: number, delayUnit?: string, event?: string } }) {

    const getColors = () => {
        switch (data.actionType) {
            case 'email':
                return {
                    border: 'border-blue-500',
                    bg: 'bg-blue-50',
                    borderLight: 'border-blue-100',
                    text: 'text-blue-900',
                    iconBg: 'bg-blue-500',
                    handle: '!bg-blue-500'
                }
            case 'tag':
                return {
                    border: 'border-pink-500',
                    bg: 'bg-pink-50',
                    borderLight: 'border-pink-100',
                    text: 'text-pink-900',
                    iconBg: 'bg-pink-500',
                    handle: '!bg-pink-500'
                }
            case 'delay':
                return {
                    border: 'border-purple-500',
                    bg: 'bg-purple-50',
                    borderLight: 'border-purple-100',
                    text: 'text-purple-900',
                    iconBg: 'bg-purple-500',
                    handle: '!bg-purple-500'
                }
            case 'wait_event':
                return {
                    border: 'border-indigo-500',
                    bg: 'bg-indigo-50',
                    borderLight: 'border-indigo-100',
                    text: 'text-indigo-900',
                    iconBg: 'bg-indigo-500',
                    handle: '!bg-indigo-500'
                }
            default: // Default to blue (email)
                return {
                    border: 'border-blue-500',
                    bg: 'bg-blue-50',
                    borderLight: 'border-blue-100',
                    text: 'text-blue-900',
                    iconBg: 'bg-blue-500',
                    handle: '!bg-blue-500'
                }
        }
    }

    const getIcon = () => {
        switch (data.actionType) {
            case 'email': return <Mail size={14} />
            case 'tag': return <Tag size={14} />
            case 'delay': return <Clock size={14} />
            case 'wait_event': return <Clock size={14} /> // Or a different icon like target/eye
            default: return <Mail size={14} />
        }
    }

    const colors = getColors()

    return (
        <div className={`bg-white border-2 ${colors.border} rounded-lg shadow-sm min-w-[200px]`}>
            <Handle type="target" position={Position.Top} className={`${colors.handle} !w-3 !h-3`} />
            <div className={`${colors.bg} p-2 border-b ${colors.borderLight} rounded-t-lg flex items-center gap-2`}>
                <div className={`${colors.iconBg} p-1 rounded text-white`}>
                    {getIcon()}
                </div>
                <span className={`font-semibold text-sm ${colors.text}`}>
                    {data.actionType === 'delay' ? 'Delay' : data.actionType === 'wait_event' ? 'Wait Until' : 'Action'}
                </span>
            </div>
            <div className="p-3 text-sm text-gray-600">
                <div className="font-medium mb-1">{data.label}</div>
                {(data.actionType === 'email' || !data.actionType) && (
                    <div className="text-xs text-slate-500 truncate max-w-[180px]">
                        Subject: {data.subject || <span className="italic opacity-50">Draft</span>}
                    </div>
                )}
                {(data.actionType === 'tag') && (
                    <div className="text-xs text-slate-500 bg-slate-100 px-1 py-0.5 rounded inline-block">
                        Tag: {data.tagName || <span className="italic opacity-50">Select tag</span>}
                    </div>
                )}
                {(data.actionType === 'delay') && (
                    <div className="text-xs text-slate-500">
                        Wait: {data.delayValue || 1} {data.delayUnit || 'days'}
                    </div>
                )}
                {(data.actionType === 'wait_event') && (
                    <div className="text-xs text-slate-500">
                        Until: <span className="font-medium text-indigo-700">{data.event || 'Any Event'}</span>
                        <div className="mt-1 text-[10px] text-slate-400">
                            Timeout: {data.delayValue || 1} {data.delayUnit || 'days'}
                        </div>
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} className={`${colors.handle} !w-3 !h-3`} />
        </div>
    )
}
