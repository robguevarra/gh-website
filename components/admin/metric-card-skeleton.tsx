import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * MetricCardSkeleton - Mirrors MetricCard layout to prevent layout shift during loading.
 * Keeps structure: title (label), icon pill, value, description line.
 */
export function MetricCardSkeleton() {
  return (
    <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="w-24">
          <Skeleton className="h-3 w-full" />
        </CardTitle>
        <div className="p-2 rounded-lg ring-1 ring-inset bg-muted/50 ring-border/50">
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-1">
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
