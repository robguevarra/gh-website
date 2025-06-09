import Link from 'next/link';
import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, BarChart2, Link2, Activity, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import {
  getAffiliateProgramAnalytics,
  AffiliateAnalyticsData,
  TrendDataPoint,
  AffiliateProgramKPIs,
  AffiliateProgramTrends,
  TopAffiliateDataPoint,
} from '@/lib/actions/affiliate-actions';
import { getRecentActivityLogs } from '@/lib/actions/activity-log-actions';
import { getHighRiskFraudFlags } from '@/lib/actions/fraud-notification-actions-simplified';
import TrendLineChart from '@/components/admin/analytics/trend-line-chart';
import TopPerformersBarChart from '@/components/admin/analytics/top-performers-bar-chart';
import RecentActivityFeed from '@/components/admin/analytics/recent-activity-feed';
import { FraudNotificationBadge } from '@/components/admin/analytics/fraud-notification-badge';
import DateRangePicker from '@/components/admin/analytics/date-range-picker';
import { format } from 'date-fns';

export default async function AffiliateAnalyticsPage(props: { searchParams?: Record<string, string | string[]> | Promise<Record<string, string | string[]>> }) {
  // Await searchParams if it's a Promise (Next.js dynamic API compliance)
  const params = props.searchParams ? await props.searchParams : {};
  const getParam = (key: string) => {
    const val = params?.[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };
  const startDate = getParam('startDate');
  const endDate = getParam('endDate');

  // Get analytics data with optional date range
  const rawAnalyticsData = await getAffiliateProgramAnalytics(startDate, endDate);
  
  // Fetch recent activity logs (limit to 12)
  const { logs: activityLogs, error: activityLogsError } = await getRecentActivityLogs(12);
  
  // Fetch high-risk fraud flags
  const { flags: highRiskFlags } = await getHighRiskFraudFlags();

  // Ensure analyticsData and its properties have defaults to prevent runtime errors
  const analyticsData: AffiliateAnalyticsData = rawAnalyticsData || {
    kpis: {
      totalActiveAffiliates: 0,
      pendingApplications: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalGmv: 0,
      totalCommissionsPaid: 0,
      averageConversionRate: 0,
      dateRangeStart: '',
      dateRangeEnd: '',
    },
    trends: {
      clicks: [],
      conversions: [],
      gmv: [],
      commissions: [],
    },
    topAffiliatesByConversions: [],
  };
  const trends = analyticsData.trends;

  // Helper function to transform trend data
  const transformTrendData = (
    clicksData: TrendDataPoint[], 
    conversionsData: TrendDataPoint[], 
    gmvData: TrendDataPoint[], 
    commissionsData: TrendDataPoint[]
  ) => {
    const allDates = new Set<string>();
    [...clicksData, ...conversionsData, ...gmvData, ...commissionsData].forEach(item => allDates.add(item.date));
    
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    if (clicksData.length > 0 || conversionsData.length > 0) {
      // For clicks and conversions chart
      return sortedDates.map(date => ({
        date,
        clicks: clicksData.find(c => c.date === date)?.value || 0,
        conversions: conversionsData.find(c => c.date === date)?.value || 0,
      }));
    } else {
      // For GMV and commissions chart
      return sortedDates.map(date => ({
        date,
        gmv: gmvData.find(c => c.date === date)?.value || 0,
        commissions: commissionsData.find(c => c.date === date)?.value || 0,
      }));
    }
  };
  
  // Generate chart data
  const clicksConversionsData = transformTrendData(trends.clicks, trends.conversions, [], []);
  const gmvCommissionsData = transformTrendData([], [], trends.gmv, trends.commissions);

  const kpis = analyticsData.kpis;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <PageHeader
            title="Affiliate Analytics"
            description={
              kpis.dateRangeStart && kpis.dateRangeEnd
                ? `Data from ${format(new Date(kpis.dateRangeStart), 'MMM d, yyyy')} to ${format(new Date(kpis.dateRangeEnd), 'MMM d, yyyy')}`
                : "Track the performance of your affiliate program."
            }
          />
        </div>
        <div className="flex items-center gap-4">
          <FraudNotificationBadge initialNotifications={highRiskFlags || []} />
          <DateRangePicker startDate={startDate} endDate={endDate} />
        </div>
      </div>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalActiveAffiliates}</div>
            {/* <p className="text-xs text-muted-foreground">+2 since last month</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingApplications}</div>
            <Link href="/admin/affiliates?status=pending" className="text-xs text-muted-foreground hover:underline">
              Review applications
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks (Last 30d)</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis.totalClicks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions (Last 30d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis.totalConversions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GMV (Last 30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${kpis.totalGmv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions Paid (Last 30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${kpis.totalCommissionsPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Conversion Rate</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.averageConversionRate.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clicks & Conversions Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            <TrendLineChart 
              data={clicksConversionsData}
              xAxisKey="date"
              lines={[
                { dataKey: 'clicks', name: 'Clicks', strokeColor: 'hsl(var(--primary))' }, 
                { dataKey: 'conversions', name: 'Conversions', strokeColor: 'hsl(var(--secondary-foreground))' }
              ]}
              yAxisLabel="Count"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>GMV & Commissions Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] pt-6">
            <TrendLineChart 
              data={gmvCommissionsData}
              xAxisKey="date"
              lines={[
                { dataKey: 'gmv', name: 'GMV ($)', strokeColor: 'hsl(var(--primary))' },
                { dataKey: 'commissions', name: 'Commissions ($)', strokeColor: 'hsl(var(--secondary-foreground))' }, 
              ]}
              yAxisLabel="Amount ($)"
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Performing Affiliates</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <TopPerformersBarChart data={analyticsData.topAffiliatesByConversions || []} />
          </CardContent>
        </Card>
      </section>

      {/* Quick Links & Activity Feed Section */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center"><Link2 className="mr-2 h-5 w-5" /> Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Link href="/admin/affiliates" className="text-sm text-primary hover:underline">View All Affiliates</Link>
            <Link href="/admin/affiliates?status=pending" className="text-sm text-primary hover:underline">Review Pending Applications</Link>
            <Link href="/admin/affiliates/flags" className="text-sm text-primary hover:underline">Manage Fraud Flags</Link>
            <Link href="/admin/affiliates/settings" className="text-sm text-primary hover:underline">Affiliate Program Settings</Link>
          </CardContent>
        </Card>
        <RecentActivityFeed 
          logs={activityLogs} 
          error={activityLogsError}
        />
      </section>
    </div>
  );
}
