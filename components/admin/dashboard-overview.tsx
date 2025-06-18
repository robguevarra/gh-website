"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, UserPlus, Activity } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MetricCard } from './metric-card';
import { ChartContainer } from './chart-container';
import { EnrollmentTrendsChart } from './enrollment-trends-chart';
import { RevenueTrendsChart } from './revenue-trends-chart';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useSharedDashboardFiltersStore } from '@/lib/stores/admin/sharedDashboardFiltersStore';
import { useEnrollmentAnalyticsStore } from '@/lib/stores/admin/enrollmentAnalyticsStore';
import { useDashboardOverviewStore } from '@/lib/stores/admin/dashboardOverviewStore';

export function DashboardOverview() {
  const router = useRouter();
  const { dateRange, setDateRange } = useSharedDashboardFiltersStore();
  const { granularity } = useEnrollmentAnalyticsStore();
  const { data, isLoading, error, fetchOverview } = useDashboardOverviewStore();

  useEffect(() => {
    if (dateRange?.from && granularity) {
        const currentState = useDashboardOverviewStore.getState();
        
        if (currentState.data === null) {
             fetchOverview(dateRange, granularity);
        } else {
            // Data exists in store, skipping fetch
        }
    } else {
        console.warn("DashboardOverview: Skipping fetch, dateRange or granularity not ready.");
    }
  }, [dateRange, granularity, fetchOverview]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatPercent = (value: number) => {
    if (isNaN(value)) return "-";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
  };

  if (error) {
    return <div className="p-4 text-red-600 border border-red-200 bg-red-50 rounded-md">Error loading overview: {error}</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const { summaryMetrics, enrollmentTrends, revenueTrends, recentActivity, performanceSummaries } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business performance</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch("/api/admin/dashboard/sync", { method: "POST" });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || "Sync failed");
                toast.success(result.message || "Manual sync completed");
              } catch (err: any) {
                toast.error(err.message || "Manual sync failed");
              }
            }}
            disabled={isLoading}
          >
            Syncing...
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch("/api/admin/dashboard/conflict", { method: "POST" });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || "Conflict check failed");
                toast.success(result.message || "Checked for email conflicts");
              } catch (err: any) {
                toast.error(err.message || "Conflict check failed");
              }
            }}
            disabled={isLoading}
          >
            Checking...
          </Button>
        </div>
        <Button onClick={() => router.push("/admin/courses/new")} disabled={isLoading}>New Course</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
          title="Enrollments"
          value={summaryMetrics.totalEnrollments}
          description={`Change: ${formatPercent(summaryMetrics.percentChange.totalEnrollments)}`}
        />
        <MetricCard
          icon={<span className="h-4 w-4 text-muted-foreground font-bold">₱</span>}
          title="Revenue"
          value={formatCurrency(summaryMetrics.totalRevenue)}
          description={`Change: ${formatPercent(summaryMetrics.percentChange.totalRevenue)}`}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          title="Conversion Rate"
          value={summaryMetrics.conversionRate.toFixed(1) + "%"}
          description={`Change: ${formatPercent(summaryMetrics.percentChange.conversionRate)}`}
        />
        <MetricCard
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          title="Active Users"
          value={summaryMetrics.activeUsers}
          description={`Change: ${formatPercent(summaryMetrics.percentChange.activeUsers)}`}
        />
      </div>

      <ChartContainer title="Enrollment Trends">
        {enrollmentTrends.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>
        ) : (
          <EnrollmentTrendsChart data={enrollmentTrends} granularity={granularity} />
        )}
      </ChartContainer>

      <ChartContainer title="Revenue Trends">
        {revenueTrends.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>
        ) : (
          <RevenueTrendsChart data={revenueTrends} granularity={data.trendGranularity as 'day' | 'week' | 'month' || 'month'} />
        )}
      </ChartContainer>

      <Tabs defaultValue="enrollments">
        <TabsList>
          <TabsTrigger value="enrollments">Recent Enrollments</TabsTrigger>
          <TabsTrigger value="payments">Recent Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Enrollments</CardTitle>
              <CardDescription>Latest users who enrolled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.enrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium">No recent enrollments</h3>
                  </div>
                ) : (
                  recentActivity.enrollments.map((enrollment, idx) => {
                    const name = `${enrollment.user.first_name || ''} ${enrollment.user.last_name || ''}`.trim() || enrollment.user.id;
                    const courseTitle = enrollment.course.title || enrollment.course.id;
                    return (
                      <div key={idx} className="flex items-center space-x-3 border-b pb-3 last:border-0 last:pb-0">
                        <Avatar>
                          <AvatarFallback>{(enrollment.user.first_name?.charAt(0) || enrollment.user.id.charAt(0)).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">Course: {courseTitle}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(enrollment.enrolledAt)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest completed payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.payments.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="mx-auto h-10 w-10 text-muted-foreground mb-3 text-4xl font-bold">₱</span>
                    <h3 className="text-lg font-medium">No recent payments</h3>
                  </div>
                ) : (
                  recentActivity.payments.map((payment, idx) => {
                    const name = `${payment.user.first_name || ''} ${payment.user.last_name || ''}`.trim() || payment.user.id;
                    return (
                      <div key={idx} className="flex items-center space-x-3 border-b pb-3 last:border-0 last:pb-0">
                        <Avatar>
                          <AvatarFallback>{(payment.user.first_name?.charAt(0) || payment.user.id.charAt(0)).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">Amount: {formatCurrency(payment.amount)}</p>
                          {payment.method && <p className="text-xs text-muted-foreground">Method: {payment.method}</p>}
                          {payment.transactionType && <p className="text-xs text-muted-foreground">Type: {payment.transactionType}</p>}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(payment.paidAt)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 