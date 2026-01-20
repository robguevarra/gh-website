'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, MousePointer2, TrendingUp, ArrowUpRight } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
    { date: "Jan 1", sent: 400, opens: 240 },
    { date: "Jan 2", sent: 300, opens: 139 },
    { date: "Jan 3", sent: 200, opens: 980 },
    { date: "Jan 4", sent: 278, opens: 390 },
    { date: "Jan 5", sent: 189, opens: 480 },
    { date: "Jan 6", sent: 239, opens: 380 },
    { date: "Jan 7", sent: 349, opens: 430 },
]

export function StudioOverview() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Stats Row - High Density */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/40 bg-muted/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscribers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">12,345</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                            <span className="text-emerald-500 flex items-center mr-1">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +2.5%
                            </span>
                            from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/40 bg-muted/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Open Rate</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">42.8%</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                            <span className="text-emerald-500 flex items-center mr-1">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +4.1%
                            </span>
                            industry avg: 35%
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/40 bg-muted/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Click Rate</CardTitle>
                        <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">12.5%</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                            <span className="text-emerald-500 flex items-center mr-1">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +1.2%
                            </span>
                            high engagement
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/40 bg-muted/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Volume</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">45.2k</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Emails sent this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Chart Section - The "Pulse" */}
            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4 border-border/40 bg-muted/10">
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Activity Pulse</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                                        cursor={{ stroke: '#4b5563', strokeWidth: 1 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="sent"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorSent)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="opens"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorOpens)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity Feed */}
                <Card className="col-span-3 border-border/40 bg-muted/10">
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-medium group-hover:bg-blue-500/20 transition-colors">
                                        BC
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none group-hover:text-blue-500 transition-colors cursor-pointer">
                                            Broadcast Sent
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            "January Newsletter" to All Users
                                        </p>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {i}h ago
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
