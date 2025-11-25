'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface DailyViewsChartProps {
    data: { date: string; count: number; unique_visitors: number }[];
}

export function DailyViewsChart({ data }: DailyViewsChartProps) {
    // Format dates for display
    const formattedData = data.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Daily Traffic</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#8884d8" name="Total Views" strokeWidth={2} />
                        <Line type="monotone" dataKey="unique_visitors" stroke="#82ca9d" name="Unique Visitors" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface TopSourcesChartProps {
    data: { source: string; count: number }[];
}

export function TopSourcesChart({ data }: TopSourcesChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface TopPagesTableProps {
    data: { path: string; count: number }[];
}

export function TopPagesTable({ data }: TopPagesTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.map((page, index) => (
                        <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                            <div className="font-medium truncate max-w-[70%]">{page.path}</div>
                            <div className="text-muted-foreground">{page.count} views</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

interface TopLocationsChartProps {
    data: { location: string; count: number }[];
}

export function TopLocationsChart({ data }: TopLocationsChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Locations</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="location" type="category" width={100} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" name="Views" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface DeviceStatsChartProps {
    data: { device: string; count: number }[];
}

export function DeviceStatsChart({ data }: DeviceStatsChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#82ca9d"
                            dataKey="count"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
