import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { FC } from 'react';

// TrendPoint type matches the API response
export type TrendPoint = { date: string; count?: number };

/**
 * EnrollmentTrendsChart
 * Renders a responsive line chart for enrollment trends.
 * Props:
 * - data: Array of { date, count }
 * - granularity: 'day' | 'week' | 'month' (controls X-axis label format)
 */
export const EnrollmentTrendsChart: FC<{ data: TrendPoint[]; granularity?: 'day' | 'week' | 'month' }> = ({ data, granularity = 'month' }) => {
  // Format X axis label based on granularity
  const formatXAxis = (date: string) => {
    const d = new Date(date);
    if (granularity === 'day') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (granularity === 'week') {
      // Show week start date
      return 'Wk of ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    // Default: month
    return d.toLocaleString('default', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tickFormatter={formatXAxis} className="text-xs" />
          <YAxis allowDecimals={false} className="text-xs" />
          <Tooltip formatter={(value: any) => value} labelFormatter={formatXAxis} />
          <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 