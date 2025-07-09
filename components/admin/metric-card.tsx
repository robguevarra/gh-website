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
    <Card className="transition-all duration-200 hover:shadow-md border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-lg">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold tracking-tight mb-1">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground font-medium">{description}</p>
        )}
      </CardContent>
    </Card>
  );
} 