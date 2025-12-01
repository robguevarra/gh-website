import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Loader2 } from 'lucide-react';
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

interface CampaignPerformanceTableProps {
    data: MarketingComparisonData[] | null;
    isLoading: boolean;
    error: string | null;
}

export default function CampaignPerformanceTable({ data, isLoading, error }: CampaignPerformanceTableProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Performance Comparison</CardTitle>
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
                <AlertDescription>Failed to load campaign performance data: {error}</AlertDescription>
            </Alert>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">No campaign data available for this period.</p>
                </CardContent>
            </Card>
        );
    }

    // Aggregate data by campaign
    const aggregatedData = data.reduce((acc, curr) => {
        if (!acc[curr.campaign_id]) {
            acc[curr.campaign_id] = {
                ...curr,
                fb_spend: 0,
                fb_clicks: 0,
                fb_impressions: 0,
                visitor_count: 0,
                bounce_count: 0,
                conversion_count: 0,
            };
        }
        acc[curr.campaign_id].fb_spend += Number(curr.fb_spend);
        acc[curr.campaign_id].fb_clicks += Number(curr.fb_clicks);
        acc[curr.campaign_id].fb_impressions += Number(curr.fb_impressions);
        acc[curr.campaign_id].visitor_count += Number(curr.visitor_count);
        acc[curr.campaign_id].bounce_count += Number(curr.bounce_count);
        acc[curr.campaign_id].conversion_count += Number(curr.conversion_count);
        // Keep the latest name
        if (curr.campaign_name && curr.campaign_name !== 'Unknown Campaign') {
            acc[curr.campaign_id].campaign_name = curr.campaign_name;
        }
        return acc;
    }, {} as Record<string, MarketingComparisonData>);

    const rows = Object.values(aggregatedData);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Campaign Performance Comparison (The "Truth" Table)</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Comparing Facebook reported metrics vs. actual site activity.
                </p>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campaign Name</TableHead>
                                <TableHead className="text-right">Spend (FB)</TableHead>
                                <TableHead className="text-right">Clicks (FB)</TableHead>
                                <TableHead className="text-right">Visits (Internal)</TableHead>
                                <TableHead className="text-right">Drop-off %</TableHead>
                                <TableHead className="text-right">Bounce Rate</TableHead>
                                <TableHead className="text-right">Conversions (Internal)</TableHead>
                                <TableHead className="text-right">Real CPA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => {
                                const dropOff = row.fb_clicks > 0 ? ((row.fb_clicks - row.visitor_count) / row.fb_clicks) * 100 : 0;
                                const bounceRate = row.visitor_count > 0 ? (row.bounce_count / row.visitor_count) * 100 : 0;
                                const realCpa = row.conversion_count > 0 ? row.fb_spend / row.conversion_count : 0;

                                return (
                                    <TableRow key={row.campaign_id}>
                                        <TableCell className="font-medium">{row.campaign_name}</TableCell>
                                        <TableCell className="text-right">${row.fb_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-right">{row.fb_clicks.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{row.visitor_count.toLocaleString()}</TableCell>
                                        <TableCell className={`text-right ${dropOff > 20 ? 'text-red-500 font-bold' : ''}`}>
                                            {dropOff.toFixed(1)}%
                                        </TableCell>
                                        <TableCell className="text-right">{bounceRate.toFixed(1)}%</TableCell>
                                        <TableCell className="text-right">{row.conversion_count}</TableCell>
                                        <TableCell className="text-right">
                                            {realCpa > 0 ? `$${realCpa.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
