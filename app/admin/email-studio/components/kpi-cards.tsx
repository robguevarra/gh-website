'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MailOpen, TrendingUp, Zap } from "lucide-react"
import { searchDirectory } from "@/app/admin/directory/actions"

export function KpiCards() {
    const [stats, setStats] = useState({
        totalSubscribers: 0,
        avgOpenRate: "42%", // Placeholder/Mock
        activeAutomations: 3, // Placeholder
        emailsSentMonth: "12.5k" // Placeholder
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Fetch real subscriber count
        searchDirectory('', { type: 'all' }, 1, 1).then(res => {
            setStats(prev => ({
                ...prev,
                totalSubscribers: res.metadata.total
            }))
            setLoading(false)
        })
    }, [])

    const cards = [
        {
            title: "Total Subscribers",
            value: loading ? "..." : stats.totalSubscribers.toLocaleString(),
            change: "+12% vs last month",
            icon: Users,
            color: "text-blue-500"
        },
        {
            title: "Avg. Open Rate",
            value: stats.avgOpenRate,
            change: "+4.1% vs industry",
            icon: MailOpen,
            color: "text-green-500"
        },
        {
            title: "Monthly Volume",
            value: stats.emailsSentMonth,
            change: "On track",
            icon: TrendingUp,
            color: "text-purple-500"
        },
        {
            title: "Active Triggers",
            value: stats.activeAutomations,
            change: "Cortex Active",
            icon: Zap,
            color: "text-orange-500"
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {card.title}
                        </CardTitle>
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground">
                            {card.change}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
