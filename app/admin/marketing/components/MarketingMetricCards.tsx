import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // Assuming skeleton component path

interface MarketingMetricCardsProps {
  data: {
    totalAdSpend: string | number | null;
    totalAttributedRevenue?: string | number | null; // Optional until attribution is ready
    overallROAS?: string | number | null; // Optional
    averageCPA?: string | number | null; // Optional
  } | null;
  isLoading: boolean;
  error: string | null;
}

const MetricCard: React.FC<{ title: string; value: string | number | null; isLoading: boolean; note?: string }> = ({ title, value, isLoading, note }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/4" />
      ) : (
        <div className="text-2xl font-bold">{value ?? 'N/A'}</div>
      )}
      {note && !isLoading && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
    </CardContent>
  </Card>
);

const MarketingMetricCards: React.FC<MarketingMetricCardsProps> = ({ data, isLoading, error }) => {
  if (error) {
    return <div className="mb-6 p-4 text-red-600 bg-red-100 border border-red-400 rounded-md">Error loading summary metrics: {error}</div>;
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Summary</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Ad Spend"
          value={data?.totalAdSpend != null ? `₱${Number(data.totalAdSpend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
          isLoading={isLoading}
        />
        <MetricCard
          title="Ad-Attributed Revenue"
          value={null} // Blocked
          isLoading={isLoading}
          note="Unavailable (Pending Attribution)"
        />
        <MetricCard
          title="Overall ROAS"
          value={null} // Blocked
          isLoading={isLoading}
          note="Unavailable (Pending Attribution)"
        />
        <MetricCard
          title="Average CPA (P2P)"
          value={null} // Blocked
          isLoading={isLoading}
          note="Unavailable (Pending Attribution)"
        />
      </div>
    </div>
  );
};

export default MarketingMetricCards; 