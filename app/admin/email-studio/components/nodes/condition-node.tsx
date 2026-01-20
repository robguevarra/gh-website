import { Handle, Position } from '@xyflow/react'
import { GitFork } from 'lucide-react'

export function ConditionNode({ data }: { data: { label: string, field?: string, operator?: string, checkValue?: string } }) {
    return (
        <div className="bg-white border-2 border-orange-500 rounded-lg shadow-sm min-w-[200px]">
            <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3" />
            <div className="bg-orange-50 p-2 border-b border-orange-100 rounded-t-lg flex items-center gap-2">
                <div className="bg-orange-500 p-1 rounded text-white">
                    <GitFork size={14} />
                </div>
                <span className="font-semibold text-sm text-orange-900">Condition (If/Else)</span>
            </div>
            <div className="p-3 text-sm text-gray-600">
                <div className="font-medium mb-1">{data.label}</div>
                <div className="text-xs text-slate-500 bg-amber-50 px-2 py-1 rounded border border-amber-100 inline-block">
                    {data.field || 'field'} {(data.operator || 'contains').replace('_', ' ')} {data.checkValue || 'value'}
                </div>
            </div>

            <div className="flex justify-between px-4 pb-2 text-xs font-semibold">
                <span className="text-emerald-600">True</span>
                <span className="text-red-600">False</span>
            </div>

            <Handle
                id="true"
                type="source"
                position={Position.Bottom}
                className="!bg-emerald-500 !w-3 !h-3 !-ml-10"
                style={{ left: '30%' }}
            />
            <Handle
                id="false"
                type="source"
                position={Position.Bottom}
                className="!bg-red-500 !w-3 !h-3 !-mr-10"
                style={{ left: '70%' }}
            />
        </div>
    )
}
