'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function ActivitySparkline() {
    // Mock Data for "Emails Sent per Day" (Last 14 Days)
    const data = [120, 132, 101, 134, 90, 230, 210, 180, 220, 240, 280, 250, 310, 400]
    const max = Math.max(...data)

    // Simple SVG generation
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100
        const y = 100 - (val / max) * 100
        return `${x},${y}`
    }).join(" ")

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Sending Activity</CardTitle>
                <CardDescription>Email volume over the last 14 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full mt-4">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                        {/* Gradient Fill */}
                        <defs>
                            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Area */}
                        <path
                            d={`M0,100 L0,${100 - (data[0] / max) * 100} ${data.map((val, i) => `L${(i / (data.length - 1)) * 100},${100 - (val / max) * 100}`).join(" ")} L100,100 Z`}
                            fill="url(#gradient)"
                        />

                        {/* Line */}
                        <polyline
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth="2"
                            points={points}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>14 days ago</span>
                    <span>Today</span>
                </div>
            </CardContent>
        </Card>
    )
}
