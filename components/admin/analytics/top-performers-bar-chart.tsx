'use client';

import { TopAffiliateDataPoint } from '@/types/admin/analytics';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Cell,
} from 'recharts';

interface TopPerformersBarChartProps {
  data: TopAffiliateDataPoint[];
  barColor?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-1">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label}
            </span>
            <span className="font-bold text-muted-foreground">
              {`${payload[0].value} conversions`}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function TopPerformersBarChart({
  data,
  barColor = 'hsl(var(--primary))',
  height = 300,
}: TopPerformersBarChartProps) {
  const router = useRouter();

  const handleBarClick = (barData: any) => {
    if (barData && barData.slug) {
      router.push(`/admin/affiliates/${barData.slug}`);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ height: `${height}px` }} className="flex items-center justify-center text-muted-foreground">
        <p>No data available for top performing affiliates.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20, // Increased left margin for longer names
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          width={120} // Adjust width as needed for affiliate names
          tickFormatter={(value) => (value.length > 15 ? `${value.substring(0, 15)}...` : value)} // Truncate long names
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }}/>
        <Legend formatter={(value) => <span className="text-muted-foreground">{value}</span>} />
        <Bar 
          dataKey="value" 
          name="Conversions" 
          radius={[0, 4, 4, 0]} 
          onClick={handleBarClick}
          style={{ cursor: 'pointer' }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
