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
                            label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}
                            outerRadius="70%"
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="source"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string, props: any) => [value, props.payload.source]} />
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
                        <YAxis dataKey="location" type="category" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip cursor={{ fill: 'transparent' }} />
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
                            label={({ device, percent }) => `${device} ${(percent * 100).toFixed(0)}%`}
                            outerRadius="70%"
                            fill="#82ca9d"
                            dataKey="count"
                            nameKey="device"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string, props: any) => [value, props.payload.device]} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface OSStatsChartProps {
    data: { os: string; count: number }[];
}

export function OSStatsChart({ data }: OSStatsChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>OS Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ os, percent }) => `${os} ${(percent * 100).toFixed(0)}%`}
                            outerRadius="70%"
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="os"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string, props: any) => [value, props.payload.os]} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface BrowserStatsChartProps {
    data: { browser: string; count: number }[];
}

export function BrowserStatsChart({ data }: BrowserStatsChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Browser Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ browser, percent }) => `${browser} ${(percent * 100).toFixed(0)}%`}
                            outerRadius="70%"
                            fill="#82ca9d"
                            dataKey="count"
                            nameKey="browser"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string, props: any) => [value, props.payload.browser]} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface TopSourcesTableProps {
    data: { source: string; count: number }[];
}

export function TopSourcesTable({ data }: TopSourcesTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.map((source, index) => (
                        <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                            <div className="font-medium truncate max-w-[70%]">{source.source}</div>
                            <div className="text-muted-foreground">{source.count} views</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
