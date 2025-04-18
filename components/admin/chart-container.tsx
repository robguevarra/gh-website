import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * ChartContainer - A reusable card for dashboard charts/visualizations.
 * Props:
 * - title: string (section/chart title)
 * - controls?: ReactNode (optional controls, e.g., filters)
 * - children: ReactNode (the chart or visualization)
 */
export interface ChartContainerProps {
  title: string;
  controls?: ReactNode;
  children: ReactNode;
}

export function ChartContainer({ title, controls, children }: ChartContainerProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {controls && <div>{controls}</div>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
} 