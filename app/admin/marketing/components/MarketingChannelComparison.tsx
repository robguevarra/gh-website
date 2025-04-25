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

const formatNumber = (num: number | null | undefined) => num?.toLocaleString() ?? 'N/A';
const formatCurrency = (num: number | null | undefined) => num != null ? `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

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
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      </TableRow>
    ))
  );

  const renderDataRows = () => (
    data?.map((channel) => (
      <TableRow key={channel.channel}>
        <TableCell className="font-medium capitalize">{channel.channel.replace(/_/g, ' ')}</TableCell>
        <TableCell>{formatCurrency(channel.spend)}</TableCell>
        <TableCell>{formatNumber(channel.impressions)}</TableCell>
        <TableCell>{formatNumber(channel.clicks)}</TableCell>
        {/* Remove Shopify-specific revenue column from this view later */}
        {/* <TableCell>{formatCurrency(channel.revenue)}</TableCell> */}
        <TableCell>{formatNumber(channel.enrollments)}</TableCell>
      </TableRow>
    ))
  );

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
              {/* <TableHead>Total Revenue</TableHead> */}
              <TableHead>P2P Enrollments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? renderSkeleton() : renderDataRows()}
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