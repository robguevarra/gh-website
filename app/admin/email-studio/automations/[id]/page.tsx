'use client'

import { useParams } from 'next/navigation'
import { getAutomation } from '../../actions'
import { AutomationBuilder } from '../../components/automation-builder'
import { useEffect, useState } from 'react'

export default function AutomationBuilderPage() {
    const params = useParams()
    const id = params?.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [initialGraph, setInitialGraph] = useState<any>(null)

    useEffect(() => {
        const fetchGraph = async () => {
            const { automation, error } = await getAutomation(id)
            if (automation?.graph) {
                setInitialGraph(automation.graph)
            }
            setIsLoading(false)
        }
        fetchGraph()
    }, [id])

    if (isLoading) return <div className="p-10 flex justify-center">Loading Builder...</div>

    return (
        <div className="p-4 h-full">
            <AutomationBuilder automationId={id} initialGraph={initialGraph} />
        </div>
    )
}
