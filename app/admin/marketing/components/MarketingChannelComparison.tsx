import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// Matches the structure from the API route
interface ChannelPerformanceData {
  channel: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  revenue: number | null;
  enrollments: number | null;
}

interface MarketingChannelComparisonProps {
  data: ChannelPerformanceData[] | null;
  isLoading: boolean;
  error: string | null;
}

const formatNumber = (num: number | null | undefined) => num != null ? Number(num).toLocaleString() : 'N/A';
const formatCurrency = (num: number | null | undefined) => num != null ? `₱${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
const formatPercent = (num: number | null | undefined) => num != null ? `${Number(num).toFixed(2)}%` : 'N/A';
const safeDiv = (num: number, den: number) => (den > 0 ? num / den : null);

const MarketingChannelComparison: React.FC<MarketingChannelComparisonProps> = ({ data, isLoading, error }) => {
  if (error) {
    return <div className="mb-6 p-4 text-red-600 bg-red-100 border border-red-400 rounded-md">Error loading channel data: {error}</div>;
  }

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      </TableRow>
    ))
  );

  const renderDataRows = () => (
    data?.map((channel) => {
      const spend = channel.spend ?? 0;
      const imps = channel.impressions ?? 0;
      const clicks = channel.clicks ?? 0;
      const ctr = safeDiv(clicks, imps);
      const cpc = safeDiv(spend, clicks);
      const cpm = safeDiv(spend * 1000, imps);
      return (
        <TableRow key={channel.channel}>
          <TableCell className="font-medium capitalize">{channel.channel.replace(/_/g, ' ')}</TableCell>
          <TableCell>{formatCurrency(channel.spend)}</TableCell>
          <TableCell>{formatNumber(channel.impressions)}</TableCell>
          <TableCell>{formatNumber(channel.clicks)}</TableCell>
          <TableCell>{formatPercent(ctr != null ? ctr * 100 : null)}</TableCell>
          <TableCell>{formatCurrency(cpc)}</TableCell>
          <TableCell>{formatCurrency(cpm)}</TableCell>
          <TableCell>{formatNumber(channel.enrollments)}</TableCell>
        </TableRow>
      );
    })
  );

  const totals = (data ?? []).reduce(
    (acc, v) => {
      acc.spend += v.spend ?? 0;
      acc.impressions += v.impressions ?? 0;
      acc.clicks += v.clicks ?? 0;
      acc.enrollments += v.enrollments ?? 0;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, enrollments: 0 }
  );
  const totalsCtr = safeDiv(totals.clicks, totals.impressions);
  const totalsCpc = safeDiv(totals.spend, totals.clicks);
  const totalsCpm = safeDiv(totals.spend * 1000, totals.impressions);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Performance by Acquisition Channel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparison based on available acquisition metrics (Facebook Ads, Organic/Tags). Shopify data excluded. ROAS, CPA, etc., are unavailable pending attribution.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Spend</TableHead>
              <TableHead>Impressions</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>CTR</TableHead>
              <TableHead>CPC</TableHead>
              <TableHead>CPM</TableHead>
              <TableHead>P2P Enrollments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? renderSkeleton() : renderDataRows()}
            {!isLoading && data && data.length > 0 && (
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="font-semibold">{formatCurrency(totals.spend)}</TableCell>
                <TableCell className="font-semibold">{formatNumber(totals.impressions)}</TableCell>
                <TableCell className="font-semibold">{formatNumber(totals.clicks)}</TableCell>
                <TableCell className="font-semibold">{formatPercent(totalsCtr != null ? totalsCtr * 100 : null)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(totalsCpc)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(totalsCpm)}</TableCell>
                <TableCell className="font-semibold">{formatNumber(totals.enrollments)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {!isLoading && (!data || data.length === 0) && (
          <p className="text-center text-muted-foreground py-4">No channel data available for the selected period.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketingChannelComparison; 