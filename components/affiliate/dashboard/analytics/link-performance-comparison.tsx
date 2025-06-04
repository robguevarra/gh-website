'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, ArrowRight } from 'lucide-react';
import { useReferralLinksData } from '@/lib/hooks/use-affiliate-dashboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LinkPerformanceComparison() {
  const [metric, setMetric] = useState<'clicks' | 'conversions' | 'conversion_rate'>('clicks');
  const { referralLinks, isLoadingReferralLinks } = useReferralLinksData();
  
  // Sort links by the selected metric
  const sortedLinks = [...(referralLinks || [])].sort((a, b) => {
    switch (metric) {
      case 'clicks':
        return (b.clicks || 0) - (a.clicks || 0);
      case 'conversions':
        return (b.conversions || 0) - (a.conversions || 0);
      case 'conversion_rate':
        const rateA = a.clicks ? (a.conversions / a.clicks) : 0;
        const rateB = b.clicks ? (b.conversions / b.clicks) : 0;
        return rateB - rateA;
      default:
        return 0;
    }
  });
  
  // Helper function to format conversion rate
  const formatRate = (clicks: number, conversions: number): string => {
    if (!clicks) return '0.00%';
    const rate = (conversions / clicks) * 100;
    return `${rate.toFixed(2)}%`;
  };

  // Helper to determine performance indicator color
  const getPerformanceColor = (index: number): string => {
    if (index === 0) return 'text-green-600';
    if (index === 1) return 'text-green-500';
    if (index === 2) return 'text-blue-500';
    return 'text-muted-foreground';
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Link Performance Comparison</CardTitle>
          <CardDescription>
            Compare which of your referral links are performing best
          </CardDescription>
        </div>
        <Select
          value={metric}
          onValueChange={(value) => setMetric(value as 'clicks' | 'conversions' | 'conversion_rate')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select Metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="clicks">Sort by Clicks</SelectItem>
            <SelectItem value="conversions">Sort by Conversions</SelectItem>
            <SelectItem value="conversion_rate">Sort by Conversion Rate</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoadingReferralLinks ? (
          <div className="space-y-3">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : sortedLinks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Conv. Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLinks.map((link, index) => (
                <TableRow key={link.id}>
                  <TableCell className={`font-medium ${getPerformanceColor(index)}`}>
                    {link.slug || 'Default'}
                    {index < 3 && (
                      <span className="ml-2 text-xs rounded-full px-2 py-0.5 bg-muted">
                        {index === 0 ? 'Top' : `#${index + 1}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{link.clicks || 0}</TableCell>
                  <TableCell className="text-right">{link.conversions || 0}</TableCell>
                  <TableCell className="text-right">
                    {formatRate(link.clicks || 0, link.conversions || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="h-[250px] flex flex-col items-center justify-center bg-muted/20 rounded-md">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No referral links data available</p>
            <p className="text-xs text-muted-foreground mt-1">Create links to start tracking their performance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
