import Link from 'next/link';
import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, BarChart2, Link2, Activity, CheckCircle, AlertTriangle } from 'lucide-react'; // Removed unused SettingsIcon
import {
  getAffiliateProgramAnalytics,
  AffiliateAnalyticsData,
  TrendDataPoint,
  AffiliateProgramKPIs,
  AffiliateProgramTrends,
  TopAffiliateDataPoint,
} from '@/lib/actions/affiliate-actions';
import TrendLineChart from '@/components/admin/analytics/trend-line-chart';
import TopPerformersBarChart from '@/components/admin/analytics/top-performers-bar-chart';

export default async function AffiliateAnalyticsPage() {
  const rawAnalyticsData = await getAffiliateProgramAnalytics();

  // Ensure analyticsData and its properties have defaults to prevent runtime errors
  const analyticsData: AffiliateAnalyticsData = rawAnalyticsData || {
    kpis: {} as AffiliateProgramKPIs,
    trends: {
      clicksLast30Days: [],
      conversionsLast30Days: [],
      gmvLast30Days: [],
      commissionsLast30Days: [],
    } as AffiliateProgramTrends,
    topAffiliatesByConversions: [], // Default for top affiliates
  };

  const kpis = analyticsData.kpis;
  const trends = analyticsData.trends;

  // Helper function to transform trend data
  const transformTrendData = (
    clicks: TrendDataPoint[], 
    conversions: TrendDataPoint[], 
    gmv: TrendDataPoint[], 
    commissions: TrendDataPoint[]
  ) => {
    const allDates = new Set<string>();
    [...clicks, ...conversions, ...gmv, ...commissions].forEach(item => allDates.add(item.date));
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const clicksConversionsData = sortedDates.map(date => ({
      date,
      clicks: clicks.find(c => c.date === date)?.value || 0,
      conversions: conversions.find(c => c.date === date)?.value || 0,
    }));

    const gmvCommissionsData = sortedDates.map(date => ({
      date,
      gmv: gmv.find(g => g.date === date)?.value || 0,
      commissions: commissions.find(c => c.date === date)?.value || 0,
    }));

    return { clicksConversionsData, gmvCommissionsData };
  };

  const { clicksConversionsData, gmvCommissionsData } = transformTrendData(
    trends?.clicksLast30Days || [],
    trends?.conversionsLast30Days || [],
    trends?.gmvLast30Days || [],
    trends?.commissionsLast30Days || []
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader 
        title="Affiliate Program Analytics" 
        description="Key performance indicators and trends for the affiliate program."
      />

      {/* KPIs Section */}
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
            <div className="text-2xl font-bold">{kpis.totalClicksLast30Days.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions (Last 30d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalConversionsLast30Days.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GMV (Last 30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.totalGmvLast30Days.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions Paid (Last 30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.totalCommissionsPaidLast30Days.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                { dataKey: 'conversions', name: 'Conversions', strokeColor: 'hsl(var(--secondary-foreground))' },
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
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><Activity className="mr-2 h-5 w-5" /> Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Activity feed placeholder: Recent sign-ups, new conversions, etc.</p>
            {/* Placeholder for real-time activity feed */}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
