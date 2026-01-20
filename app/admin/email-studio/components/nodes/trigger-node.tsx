import { Handle, Position } from '@xyflow/react'
import { Zap } from 'lucide-react'

export function TriggerNode({ data }: { data: { label: string, event?: string, customEventName?: string, filterTag?: string, filterCampaign?: string } }) {
    return (
        <div className="bg-white border-2 border-emerald-500 rounded-lg shadow-sm min-w-[200px]">
            <div className="bg-emerald-50 p-2 border-b border-emerald-100 rounded-t-lg flex items-center gap-2">
                <div className="bg-emerald-500 p-1 rounded text-white">
                    <Zap size={14} />
                </div>
                <span className="font-semibold text-sm text-emerald-900">Trigger</span>
            </div>
            <div className="p-3 text-sm text-gray-600">
                <div className="font-medium mb-1">{data.label}</div>
                <div className="text-xs text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded inline-block">
                    Event: {data.event || 'Select event'}
                </div>
                {data.event === 'tag_added' && data.filterTag && (
                    <div className="mt-1 text-xs text-slate-500">
                        Tag: <span className="font-medium">{data.filterTag}</span>
                    </div>
                )}
                {data.event === 'email_clicked' && data.filterCampaign && (
                    <div className="mt-1 text-xs text-slate-500">
                        Campaign: <span className="font-medium truncate max-w-[150px] inline-block align-bottom">{data.filterCampaign}</span>
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3" />
        </div>
    )
}
