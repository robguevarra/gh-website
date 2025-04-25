import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'; // Assuming recharts is used
import { Skeleton } from '@/components/ui/skeleton';
import { Granularity } from './RevenueFilters'; // Import granularity type

interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

interface Props {
  data?: RevenueTrendPoint[];
  granularity: Granularity;
  isLoading?: boolean;
}

// Basic formatter for chart axes/tooltips
const formatAxisCurrency = (value: number) => `$${(value / 1000).toFixed(0)}k`;
const formatTooltipCurrency = (value: number) => `$${value.toFixed(2)}`;

const RevenueTrendsChart: React.FC<Props> = ({ data, granularity, isLoading }) => {
  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <p className="text-muted-foreground">No revenue data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend ({granularity.charAt(0).toUpperCase() + granularity.slice(1)})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: '12px', borderRadius: '0.5rem' }}
              formatter={(value: number) => [formatTooltipCurrency(value), 'Revenue']}
            />
            <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RevenueTrendsChart; 