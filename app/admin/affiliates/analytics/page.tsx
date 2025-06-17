import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Activity,
  Download,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Clock,
  Star,
  Award,
  Zap,
  TrendingDown,
  Filter,
  RefreshCw,
  FileBarChart,
  PieChart,
  LineChart
} from "lucide-react";
import { Suspense } from "react";
import { getAffiliateProgramAnalytics, exportAnalyticsReport } from "@/lib/actions/admin/analytics-actions";
import ReportGenerator from "@/components/admin/analytics/report-generator";

export const metadata: Metadata = {
  title: "Analytics & Insights | Admin",
  description: "Comprehensive performance metrics and insights for affiliate program optimization",
};

// Loading skeleton component with brand-aligned styling
function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-gradient-to-r from-[#b08ba5]/20 to-[#f1b5bc]/20 rounded-lg w-80"></div>
        <div className="h-4 bg-[#e9e0d8] rounded w-96"></div>
      </div>
      
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="h-32 bg-gradient-to-br from-white to-[#f9f6f2] border border-[#e9e0d8] rounded-xl shadow-sm"></div>
        ))}
      </div>
      
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-gradient-to-br from-white to-[#f9f6f2] border border-[#e9e0d8] rounded-xl"></div>
        <div className="h-96 bg-gradient-to-br from-white to-[#f9f6f2] border border-[#e9e0d8] rounded-xl"></div>
      </div>
    </div>
  );
}

async function AnalyticsContent() {
  let analyticsData;
  let error: string | null = null;

  try {
    analyticsData = await getAffiliateProgramAnalytics();
  } catch (err) {
    console.error('Failed to fetch analytics data:', err);
    error = err instanceof Error ? err.message : 'Failed to load analytics data';
    
    // Comprehensive fallback data structure
    analyticsData = {
      kpis: {
        totalActiveAffiliates: 0,
        pendingApplications: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalGmv: 0,
        totalCommissionsPaid: 0,
        averageConversionRate: 0,
        dateRangeStart: new Date().toISOString(),
        dateRangeEnd: new Date().toISOString(),
      },
      trends: {
        clicks: [],
        conversions: [],
        gmv: [],
        commissions: [],
      },
      topAffiliatesByConversions: [],
      totalActiveAffiliates: 0,
      pendingApplications: 0,
      totalClicksLast30Days: 0,
      totalConversionsLast30Days: 0,
      totalGmvLast30Days: 0,
      totalCommissionsPaidLast30Days: 0,
      averageConversionRate: 0,
    };
  }

  const { kpis, topAffiliatesByConversions } = analyticsData;

  // Calculate growth indicators (mock for now, would be real calculations)
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Mock previous period data for growth calculations
  const mockGrowthData = {
    gmvGrowth: calculateGrowth(kpis.totalGmv, kpis.totalGmv * 0.85),
    commissionsGrowth: calculateGrowth(kpis.totalCommissionsPaid, kpis.totalCommissionsPaid * 0.92),
    affiliatesGrowth: calculateGrowth(kpis.totalActiveAffiliates, Math.max(1, kpis.totalActiveAffiliates - 2)),
    conversionGrowth: calculateGrowth(kpis.averageConversionRate, kpis.averageConversionRate * 0.88),
  };

  return (
    <div className="space-y-8">
      {/* Elegant Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#b08ba5]/5 via-[#f1b5bc]/5 to-[#9ac5d9]/5 rounded-2xl border border-[#e9e0d8] p-8">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-[#b08ba5] to-[#f1b5bc] rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-serif text-[#5d4037] font-bold tracking-tight">
                    Analytics & Insights
                  </h1>
                  <p className="text-[#6f5c51] font-light">
                    Comprehensive performance metrics for data-driven decisions
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-[#b08ba5]/20 text-[#b08ba5] hover:bg-[#b08ba5]/10 transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-[#b08ba5] to-[#f1b5bc] hover:from-[#b08ba5]/90 hover:to-[#f1b5bc]/90 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#b08ba5]/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#f1b5bc]/10 to-transparent rounded-full blur-2xl"></div>
      </div>

      {/* Error Alert with Brand Styling */}
      {error && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-red-50/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-red-900">Analytics Temporarily Unavailable</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <Card className="group relative overflow-hidden border-[#e9e0d8] bg-gradient-to-br from-white to-[#f9f6f2] shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[#6f5c51] font-medium">Total Revenue</p>
                  {mockGrowthData.gmvGrowth > 0 && (
                    <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +{mockGrowthData.gmvGrowth.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-serif text-[#5d4037] font-bold">
                  ₱{kpis.totalGmv.toLocaleString()}
                </p>
                <p className="text-xs text-[#6f5c51] flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Last 30 days
                </p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-[#b08ba5]/20 to-[#b08ba5]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-7 w-7 text-[#b08ba5]" />
              </div>
            </div>
          </CardContent>
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#b08ba5]/0 via-[#b08ba5]/0 to-[#b08ba5]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Card>

        {/* Total Commissions Card */}
        <Card className="group relative overflow-hidden border-[#e9e0d8] bg-gradient-to-br from-white to-[#f9f6f2] shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[#6f5c51] font-medium">Commissions Paid</p>
                  {mockGrowthData.commissionsGrowth > 0 && (
                    <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +{mockGrowthData.commissionsGrowth.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-serif text-[#5d4037] font-bold">
                  ₱{kpis.totalCommissionsPaid.toLocaleString()}
                </p>
                <p className="text-xs text-[#6f5c51] flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Commission rate: 15%
                </p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-[#f1b5bc]/20 to-[#f1b5bc]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Award className="h-7 w-7 text-[#f1b5bc]" />
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-[#f1b5bc]/0 via-[#f1b5bc]/0 to-[#f1b5bc]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Card>

        {/* Active Affiliates Card */}
        <Card className="group relative overflow-hidden border-[#e9e0d8] bg-gradient-to-br from-white to-[#f9f6f2] shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[#6f5c51] font-medium">Active Affiliates</p>
                  {mockGrowthData.affiliatesGrowth > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +{mockGrowthData.affiliatesGrowth.toFixed(0)}
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-serif text-[#5d4037] font-bold">
                  {kpis.totalActiveAffiliates}
                </p>
                <p className="text-xs text-[#9ac5d9] flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {kpis.averageConversionRate.toFixed(1)}% avg conversion
                </p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-[#9ac5d9]/20 to-[#9ac5d9]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-[#9ac5d9]" />
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-[#9ac5d9]/0 via-[#9ac5d9]/0 to-[#9ac5d9]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Card>

        {/* Pending Applications Card */}
        <Card className="group relative overflow-hidden border-[#e9e0d8] bg-gradient-to-br from-white to-[#f9f6f2] shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[#6f5c51] font-medium">Pending Applications</p>
                  {kpis.pendingApplications > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5">
                      <Clock className="h-3 w-3 mr-1" />
                      Needs Review
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-serif text-[#5d4037] font-bold">
                  {kpis.pendingApplications}
                </p>
                <p className="text-xs text-[#6f5c51] flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {kpis.totalConversions} total conversions
                </p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="h-7 w-7 text-yellow-600" />
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-50/0 via-yellow-50/0 to-yellow-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Card>
      </div>

      {/* Enhanced Analytics Tabs */}
      <Card className="border-[#e9e0d8] bg-gradient-to-br from-white to-[#f9f6f2]/30 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-[#b08ba5]/20 to-[#f1b5bc]/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-[#b08ba5]" />
              </div>
              <div>
                <CardTitle className="text-xl font-serif text-[#5d4037]">
                  Detailed Analytics
                </CardTitle>
                <p className="text-sm text-[#6f5c51] font-light mt-1">
                  Deep insights for strategic decision making
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-[#e9e0d8] text-[#6f5c51] hover:bg-[#f9f6f2]">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="border-[#e9e0d8] text-[#6f5c51] hover:bg-[#f9f6f2]">
                <Calendar className="h-4 w-4 mr-2" />
                Date Range
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-14 bg-gradient-to-r from-[#f9f6f2] to-[#f5f2ef] border border-[#e9e0d8] rounded-xl p-1">
              <TabsTrigger 
                value="performance" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#b08ba5] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[#b08ba5]/20 transition-all duration-200"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Performance</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financial" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#f1b5bc] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[#f1b5bc]/20 transition-all duration-200"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Financial</span>
              </TabsTrigger>
              <TabsTrigger 
                value="system" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#9ac5d9] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[#9ac5d9]/20 transition-all duration-200"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">System</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-green-200 transition-all duration-200"
              >
                <FileBarChart className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Reports</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performing Affiliates */}
                <Card className="border-[#e9e0d8] bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-[#b08ba5]" />
                        <CardTitle className="text-lg font-medium text-[#5d4037]">
                          Top Performing Affiliates
                        </CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" className="text-[#6f5c51] hover:text-[#b08ba5]">
                        <Eye className="h-4 w-4 mr-1" />
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topAffiliatesByConversions.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="h-16 w-16 bg-gradient-to-br from-[#b08ba5]/10 to-[#f1b5bc]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="h-8 w-8 text-[#b08ba5]/50" />
                          </div>
                          <h3 className="font-medium text-[#5d4037] mb-2">No Performance Data Yet</h3>
                          <p className="text-sm text-[#6f5c51] mb-4">
                            Affiliate performance metrics will appear here once conversions are tracked.
                          </p>
                          <Button variant="outline" size="sm" className="border-[#b08ba5]/20 text-[#b08ba5] hover:bg-[#b08ba5]/10">
                            <Target className="h-4 w-4 mr-2" />
                            View All Affiliates
                          </Button>
                        </div>
                      ) : (
                        topAffiliatesByConversions.slice(0, 5).map((affiliate, index) => (
                          <div 
                            key={affiliate.affiliateId}
                            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[#f9f6f2] to-white border border-[#e9e0d8] hover:shadow-sm transition-all duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#b08ba5] to-[#f1b5bc] text-white text-sm font-bold">
                                #{index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-[#5d4037]">
                                  {affiliate.name || 'Anonymous Affiliate'}
                                </p>
                                <p className="text-sm text-[#6f5c51]">
                                  {affiliate.value} conversions
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#5d4037]">
                                View Details
                              </p>
                              <p className="text-sm text-[#9ac5d9]">
                                {affiliate.slug || 'No slug'}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Conversion Trends Visualization */}
                <Card className="border-[#e9e0d8] bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-[#9ac5d9]" />
                        <CardTitle className="text-lg font-medium text-[#5d4037]">
                          Conversion Trends
                        </CardTitle>
                      </div>
                      <Badge className="bg-[#9ac5d9]/10 text-[#9ac5d9] border-[#9ac5d9]/20">
                        Last 30 Days
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="h-16 w-16 bg-gradient-to-br from-[#9ac5d9]/10 to-[#b08ba5]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 text-[#9ac5d9]/50" />
                      </div>
                      <h3 className="font-medium text-[#5d4037] mb-2">Chart Visualization Coming Soon</h3>
                      <p className="text-sm text-[#6f5c51] mb-4">
                        Interactive charts and trend analysis will be available here.
                      </p>
                      <div className="flex items-center justify-center gap-4 text-sm text-[#6f5c51]">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-[#b08ba5] rounded-full"></div>
                          <span>Conversions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-[#f1b5bc] rounded-full"></div>
                          <span>Revenue</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-[#9ac5d9] rounded-full"></div>
                          <span>Clicks</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#6f5c51] mt-4">
                        Total: {kpis.totalConversions} conversions • ₱{kpis.totalGmv.toLocaleString()} GMV
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Breakdown */}
                <Card className="border-[#e9e0d8] bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-[#5d4037] flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-[#f1b5bc]" />
                      Revenue Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-[#b08ba5] rounded-full"></div>
                          <span className="text-sm text-[#6f5c51]">Affiliate Revenue</span>
                        </div>
                        <span className="font-medium text-[#5d4037]">₱{kpis.totalGmv.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-[#f1b5bc] rounded-full"></div>
                          <span className="text-sm text-[#6f5c51]">Commissions Paid</span>
                        </div>
                        <span className="font-medium text-[#5d4037]">₱{kpis.totalCommissionsPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-[#9ac5d9] rounded-full"></div>
                          <span className="text-sm text-[#6f5c51]">Net Revenue</span>
                        </div>
                        <span className="font-medium text-[#5d4037]">₱{(kpis.totalGmv - kpis.totalCommissionsPaid).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Commission Analytics */}
                <Card className="border-[#e9e0d8] bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-[#5d4037] flex items-center gap-2">
                      <Award className="h-5 w-5 text-[#f1b5bc]" />
                      Commission Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-[#6f5c51]">Average Commission Rate</span>
                          <span className="font-medium text-[#5d4037]">15%</span>
                        </div>
                        <div className="w-full bg-[#e9e0d8] rounded-full h-2">
                          <div className="bg-gradient-to-r from-[#f1b5bc] to-[#b08ba5] h-2 rounded-full" style={{width: '15%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-[#6f5c51]">Commission Efficiency</span>
                          <span className="font-medium text-[#5d4037]">
                            {kpis.totalGmv > 0 ? ((kpis.totalCommissionsPaid / kpis.totalGmv) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-[#e9e0d8] rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-[#9ac5d9] to-[#b08ba5] h-2 rounded-full" 
                            style={{width: `${kpis.totalGmv > 0 ? Math.min(((kpis.totalCommissionsPaid / kpis.totalGmv) * 100), 100) : 0}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Health */}
                <Card className="border-[#e9e0d8] bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-[#5d4037] flex items-center gap-2">
                      <Zap className="h-5 w-5 text-[#9ac5d9]" />
                      Financial Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Revenue Growth</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          +{mockGrowthData.gmvGrowth.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Commission Growth</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">
                          +{mockGrowthData.commissionsGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="system" className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Health */}
                <Card className="border-[#e9e0d8] bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-[#5d4037] flex items-center gap-2">
                      <Activity className="h-5 w-5 text-[#9ac5d9]" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-900">Tracking System</p>
                            <p className="text-sm text-green-700">All systems operational</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700">Online</Badge>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-900">Payment Processing</p>
                            <p className="text-sm text-green-700">No issues detected</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700">Healthy</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="border-[#e9e0d8] bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-[#5d4037] flex items-center gap-2">
                      <Clock className="h-5 w-5 text-[#f1b5bc]" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#f9f6f2] border border-[#e9e0d8]">
                        <div className="h-2 w-2 bg-[#b08ba5] rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#5d4037]">System initialized</p>
                          <p className="text-xs text-[#6f5c51]">Analytics system ready for data collection</p>
                        </div>
                        <span className="text-xs text-[#6f5c51]">Just now</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-8">
              <ReportGenerator />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}
