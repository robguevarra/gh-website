import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MarketingComparisonData {
    campaign_id: string;
    campaign_name: string;
    date: string;
    fb_spend: number;
    fb_clicks: number;
    fb_impressions: number;
    visitor_count: number;
    bounce_count: number;
    conversion_count: number;
}

interface MarketingVsVisitorChartProps {
    data: MarketingComparisonData[] | null;
    isLoading: boolean;
    error: string | null;
}

export default function MarketingVsVisitorChart({ data, isLoading, error }: MarketingVsVisitorChartProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Traffic Quality (Clicks vs. Visits)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load chart data: {error}</AlertDescription>
            </Alert>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Traffic Quality (Clicks vs. Visits)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">No data available for this period.</p>
                </CardContent>
            </Card>
        );
    }

    // Aggregate data by date
    const chartData = Object.values(data.reduce((acc, curr) => {
        const date = curr.date; // Assuming date is YYYY-MM-DD
        if (!acc[date]) {
            acc[date] = {
                date,
                clicks: 0,
                visits: 0,
            };
        }
        acc[date].clicks += Number(curr.fb_clicks);
        acc[date].visits += Number(curr.visitor_count);
        return acc;
    }, {} as Record<string, { date: string; clicks: number; visits: number }>))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <Card>
            <CardHeader>
                <CardTitle>Traffic Quality (Clicks vs. Visits)</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Monitoring the gap between Facebook Clicks and Actual Site Visits.
                </p>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        />
                        <YAxis />
                        <Tooltip
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="clicks" name="Facebook Clicks" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="visits" name="Actual Visits" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
