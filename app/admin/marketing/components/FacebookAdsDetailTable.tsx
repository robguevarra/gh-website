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
interface FacebookAdDetail {
  date: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
}

interface FacebookAdsDetailTableProps {
  data: FacebookAdDetail[] | null;
  isLoading: boolean;
  error: string | null;
}

const formatNumber = (num: number | null | undefined) => num?.toLocaleString() ?? 'N/A';
const formatCurrency = (num: number | null | undefined) => num != null ? `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
const formatDate = (dateStr: string | null | undefined) => dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';

const FacebookAdsDetailTable: React.FC<FacebookAdsDetailTableProps> = ({ data, isLoading, error }) => {
  if (error) {
    return <div className="mb-6 p-4 text-red-600 bg-red-100 border border-red-400 rounded-md">Error loading Facebook Ads details: {error}</div>;
  }

  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-fb-${index}`}>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        {/* Placeholders for blocked columns */}
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
      </TableRow>
    ))
  );

  const renderDataRows = () => (
    data?.map((ad, index) => (
      <TableRow key={`${ad.ad_id}-${index}`}>
        <TableCell>{formatDate(ad.date)}</TableCell>
        <TableCell>{ad.campaign_name ?? 'N/A'}</TableCell>
        <TableCell>{ad.adset_name ?? 'N/A'}</TableCell>
        <TableCell>{ad.ad_name ?? 'N/A'}</TableCell>
        <TableCell>{formatCurrency(ad.spend)}</TableCell>
        <TableCell>{formatNumber(ad.impressions)}</TableCell>
        <TableCell>{formatNumber(ad.clicks)}</TableCell>
        {/* Blocked columns */}
        <TableCell className="text-muted-foreground text-xs">N/A</TableCell>
        <TableCell className="text-muted-foreground text-xs">N/A</TableCell>
        <TableCell className="text-muted-foreground text-xs">N/A</TableCell>
      </TableRow>
    ))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facebook Ads Performance Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Shows spend, impressions, and clicks per ad. Attributed Revenue, ROAS, and CPA are unavailable pending attribution setup.
        </p>
        {/* TODO: Add sorting/filtering controls here */}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Ad Set</TableHead>
              <TableHead>Ad</TableHead>
              <TableHead>Spend</TableHead>
              <TableHead>Impressions</TableHead>
              <TableHead>Clicks</TableHead>
              {/* Blocked headers */}
              <TableHead className="text-muted-foreground"><span className="line-through">Attr. Revenue</span></TableHead>
              <TableHead className="text-muted-foreground"><span className="line-through">ROAS</span></TableHead>
              <TableHead className="text-muted-foreground"><span className="line-through">CPA</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? renderSkeleton() : renderDataRows()}
          </TableBody>
        </Table>
        {!isLoading && (!data || data.length === 0) && (
          <p className="text-center text-muted-foreground py-4">No Facebook ad data available for the selected period.</p>
        )}
        {/* TODO: Add pagination controls here */}
      </CardContent>
    </Card>
  );
};

export default FacebookAdsDetailTable; 