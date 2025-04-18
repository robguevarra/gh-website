import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { FC } from 'react';

// TrendPoint type matches the API response
export type TrendPoint = { date: string; amount?: number };

/**
 * RevenueTrendsChart
 * Renders a responsive area chart for revenue trends.
 * Props:
 * - data: Array of { date, amount }
 */
export const RevenueTrendsChart: FC<{ data: TrendPoint[] }> = ({ data }) => {
  // Format month for X axis
  const formatMonth = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString('default', { month: 'short', year: '2-digit' });
  };
  // Format currency for tooltip
  const formatCurrency = (value: number) => value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tickFormatter={formatMonth} className="text-xs" />
          <YAxis allowDecimals={false} className="text-xs" />
          <Tooltip formatter={(value: any) => formatCurrency(value)} labelFormatter={formatMonth} />
          <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}; 