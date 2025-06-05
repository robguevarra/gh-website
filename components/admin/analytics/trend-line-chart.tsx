'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendLineChartProps {
  data: any[];
  xAxisKey: string;
  lines: Array<{
    dataKey: string;
    name: string;
    strokeColor: string;
    yAxisId?: string; // Optional: for multiple Y-axes
  }>;
  yAxisLabel?: string; // Optional: label for the Y-axis
  height?: number; // Optional: height of the chart
}

const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  xAxisKey,
  lines,
  yAxisLabel,
  height = 300, // Default height
}) => {
  if (!data || data.length === 0) {
    return <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No data available for this chart.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey={xAxisKey} 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 12, dx: -5 } : undefined}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.strokeColor}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            yAxisId={0} // Force use of the default Y-axis
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TrendLineChart;
