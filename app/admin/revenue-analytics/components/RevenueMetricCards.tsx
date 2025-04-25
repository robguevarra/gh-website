import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
// Assume formatCurrency might be in a different location or needs creation.
// Using Intl.NumberFormat directly for now.
// import { formatCurrency } from '@/lib/utils';

interface RevenueSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  // Add trend percentage later
}

interface Props {
  data?: RevenueSummary;
  isLoading?: boolean;
}

// Basic currency formatter (replace with a robust one if needed)
const formatCurrency = (value: number, currency = 'PHP') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const RevenueMetricCards: React.FC<Props> = ({ data, isLoading }) => {
  const renderCardContent = (title: string, value: string | number, isCurrency = false) => {
    if (isLoading || !data) {
      return <Skeleton className="h-8 w-24" />;
    }
    // Use the local or imported formatter
    const formattedValue = typeof value === 'number' && isCurrency ? formatCurrency(value) : value.toString();
    return <div className="text-2xl font-bold">{formattedValue}</div>;
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          {/* Icon can go here */}
        </CardHeader>
        <CardContent>
          {renderCardContent('Total Revenue', data?.totalRevenue ?? 0, true)}
          {/* Trend text can go here */}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {renderCardContent('Total Transactions', data?.totalTransactions ?? 0)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Transaction Value</CardTitle>
        </CardHeader>
        <CardContent>
          {renderCardContent('Avg. Transaction Value', data?.averageTransactionValue ?? 0, true)}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueMetricCards; 