'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, RefreshCw } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface LiveAudienceCounterProps {
    count: number | null
    totalUsers: number
    isLoading: boolean
}

export function LiveAudienceCounter({ count, totalUsers, isLoading }: LiveAudienceCounterProps) {
    const [displayCount, setDisplayCount] = useState(0)
    const [percentage, setPercentage] = useState(0)

    useEffect(() => {
        if (count !== null) {
            // Simple animation for the number
            setDisplayCount(count)
            // Calculate percentage
            setPercentage(totalUsers > 0 ? (count / totalUsers) * 100 : 0)
        }
    }, [count, totalUsers])

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-b from-card to-muted/20">
            <CardHeader className="border-b bg-muted/5 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                        Estimated Reach
                    </CardTitle>
                    {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

                {/* Visual Gauge / Donut Substitute */}
                <div className="relative">
                    <div className="flex items-end gap-2 mb-1">
                        <span className={cn("text-5xl font-bold tracking-tight transition-all duration-500", isLoading ? "opacity-50 blur-[2px]" : "opacity-100")}>
                            {displayCount.toLocaleString()}
                        </span>
                        <span className="text-lg text-muted-foreground mb-1.5 font-medium">users</span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Matching <span className="font-semibold text-foreground">{percentage.toFixed(1)}%</span> of total audience
                    </p>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0</span>
                        <span>{totalUsers.toLocaleString()}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                </div>

                {/* Insights / Helper Text */}
                <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 flex gap-3 items-start">
                    <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Audience Quality</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {percentage < 5
                                ? "This is a niche segment. Good for highly personalized, high-conversion campaigns."
                                : percentage > 50
                                    ? "Broad segment. Ensure generic messaging appealing to a wide audience."
                                    : "Balanced segment size. Great for targeted promotions."
                            }
                        </p>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
