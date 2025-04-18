import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * MetricCard - A reusable card for dashboard metrics.
 * Props:
 * - icon: ReactNode (icon component)
 * - title: string (metric label)
 * - value: string | number (main metric value)
 * - description?: string (optional subtext)
 */
export interface MetricCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  description?: string;
}

export function MetricCard({ icon, title, value, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
} 