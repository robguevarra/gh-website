import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, AlertTriangle, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ConversionStats } from "@/lib/actions/admin/conversion-actions";

interface ConversionStatsCardsProps {
  stats: ConversionStats;
}

export function ConversionStatsCards({ stats }: ConversionStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Pending Conversions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Conversions</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_pending}</div>
          <p className="text-xs text-muted-foreground">
            {formatPrice(stats.pending_value)} value
          </p>
        </CardContent>
      </Card>

      {/* Cleared Conversions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cleared Conversions</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_cleared}</div>
          <p className="text-xs text-muted-foreground">
            {formatPrice(stats.cleared_value)} value
          </p>
        </CardContent>
      </Card>

      {/* Paid Conversions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Conversions</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_paid}</div>
          <p className="text-xs text-muted-foreground">
            {formatPrice(stats.paid_value)} paid out
          </p>
        </CardContent>
      </Card>

      {/* Flagged Conversions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Flagged Conversions</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_flagged}</div>
          <p className="text-xs text-muted-foreground">
            Require review
          </p>
        </CardContent>
      </Card>

      {/* Average Conversion Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Conversion Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPrice(stats.avg_conversion_value)}</div>
          <p className="text-xs text-muted-foreground">
            Per conversion
          </p>
        </CardContent>
      </Card>

      {/* Average Days to Clear */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Days to Clear</CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avg_days_to_clear.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            Processing time
          </p>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Conversion Value</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPrice(stats.total_value)}</div>
          <p className="text-xs text-muted-foreground">
            Across all {stats.total_pending + stats.total_cleared + stats.total_paid + stats.total_flagged} conversions
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 