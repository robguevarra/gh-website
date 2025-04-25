import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentMethodRevenue {
  payment_method: string;
  source_platform: 'xendit' | 'shopify';
  total_revenue: number;
  transaction_count: number;
}

interface Props {
  data?: PaymentMethodRevenue[];
  isLoading?: boolean;
}

// Simple color generation (replace with a more robust palette if needed)
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];
const formatCurrency = (value: number, currency = 'PHP') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const RevenueByPaymentMethodChart: React.FC<Props> = ({ data, isLoading }) => {

  if (isLoading || !data) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
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
            <CardTitle>Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[300px]">
            <p className="text-muted-foreground">No payment method data available.</p>
          </CardContent>
        </Card>
      );
    }

  // Prepare data for Pie chart
  const chartData = data.map(item => ({
    name: `${item.payment_method} (${item.source_platform})`,
    value: item.total_revenue,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
            <Legend wrapperStyle={{fontSize: "12px"}}/>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RevenueByPaymentMethodChart; 