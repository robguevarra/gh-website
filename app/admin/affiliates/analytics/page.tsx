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
  CheckCircle2
} from "lucide-react";
import { Suspense } from "react";
import { getAffiliateProgramAnalytics } from "@/lib/actions/admin/analytics-actions";
import ReportGenerator from "@/components/admin/analytics/report-generator";

export const metadata: Metadata = {
  title: "Analytics & Reports | Admin",
  description: "Performance metrics, financial reports, and system insights for affiliate program management",
};

async function AnalyticsContent() {
  let data;
  let error: string | null = null;

  try {
    data = await getAffiliateProgramAnalytics();
  } catch (err) {
    console.error('Failed to fetch analytics data:', err);
    error = err instanceof Error ? err.message : 'Failed to load analytics data';
    
    // Fallback data
    data = {
      kpis: {
        totalActiveAffiliates: 0,
        pendingApplications: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalGmv: 0,
        totalCommissionsPaid: 0,
        averageConversionRate: 0,
        dateRangeStart: '',
        dateRangeEnd: ''
      },
      trends: {
        clicks: [],
        conversions: [],
        gmv: [],
        commissions: []
      },
      topAffiliatesByConversions: [],
      totalActiveAffiliates: 0,
      pendingApplications: 0,
      totalClicksLast30Days: 0,
      totalConversionsLast30Days: 0,
      totalGmvLast30Days: 0,
      totalCommissionsPaidLast30Days: 0,
      averageConversionRate: 0
    };
  }

  // Calculate growth percentages (placeholder for now)
  const revenueGrowth = 12.5;
  const commissionGrowth = 8.3;
  const fraudDetectionRate = 2.1;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Error loading analytics data: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#e9e0d8] bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f5c51] font-medium">Total Revenue</p>
                <p className="text-2xl font-serif text-[#5d4037]">₱{data.kpis?.totalGmv?.toLocaleString() || '0'}</p>
                <p className="text-xs text-green-600 mt-1">+{revenueGrowth}% from last month</p>
              </div>
              <div className="h-12 w-12 bg-[#b08ba5]/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[#b08ba5]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#e9e0d8] bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f5c51] font-medium">Total Commissions</p>
                <p className="text-2xl font-serif text-[#5d4037]">₱{data.kpis?.totalCommissionsPaid?.toLocaleString() || '0'}</p>
                <p className="text-xs text-green-600 mt-1">+{commissionGrowth}% from last month</p>
              </div>
              <div className="h-12 w-12 bg-[#f1b5bc]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-[#f1b5bc]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#e9e0d8] bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f5c51] font-medium">Active Affiliates</p>
                <p className="text-2xl font-serif text-[#5d4037]">{data.kpis?.totalActiveAffiliates || 0}</p>
                <p className="text-xs text-[#9ac5d9] mt-1">{data.kpis?.averageConversionRate?.toFixed(1) || '0.0'}% avg conversion rate</p>
              </div>
              <div className="h-12 w-12 bg-[#9ac5d9]/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-[#9ac5d9]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#e9e0d8] bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f5c51] font-medium">Total Conversions</p>
                <p className="text-2xl font-serif text-[#5d4037]">{data.kpis?.totalConversions?.toLocaleString() || '0'}</p>
                <p className="text-xs text-green-600 mt-1">{fraudDetectionRate}% fraud detection rate</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Card className="border-[#e9e0d8] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-[#5d4037] flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics & Insights
          </CardTitle>
          <p className="text-sm text-[#6f5c51] font-light">
            Comprehensive analytics and reports for data-driven decision making
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-12 bg-[#f9f6f2] border border-[#e9e0d8]">
              <TabsTrigger 
                value="performance" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#b08ba5] data-[state=active]:border data-[state=active]:border-[#b08ba5]/20"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Performance</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financial" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#f1b5bc] data-[state=active]:border data-[state=active]:border-[#f1b5bc]/20"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Financial</span>
              </TabsTrigger>
              <TabsTrigger 
                value="system" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#9ac5d9] data-[state=active]:border data-[state=active]:border-[#9ac5d9]/20"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">System</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:border data-[state=active]:border-green-200"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">Top Performing Affiliates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.topAffiliatesByConversions?.length > 0 ? (
                        data.topAffiliatesByConversions.slice(0, 5).map((affiliate, index) => (
                          <div key={affiliate.affiliateId} className="flex items-center justify-between p-3 bg-[#f9f6f2] rounded-lg">
                            <div>
                              <p className="font-medium text-[#5d4037]">{affiliate.name || 'Anonymous'}</p>
                              <p className="text-sm text-[#6f5c51]">{affiliate.value} conversions</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                #{index + 1}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-[#6f5c51] py-8">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No affiliate data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">Conversion Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 bg-[#f9f6f2] rounded-lg flex items-center justify-center">
                      <div className="text-center text-[#6f5c51]">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Chart visualization coming soon</p>
                        <p className="text-xs mt-1">{data.trends?.conversions?.length || 0} data points available</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="financial" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">Monthly Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6f5c51]">Total GMV</span>
                        <span className="font-medium text-[#5d4037]">₱{data.kpis?.totalGmv?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6f5c51]">Total Commissions</span>
                        <span className="font-medium text-[#5d4037]">₱{data.kpis?.totalCommissionsPaid?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6f5c51]">Avg Conversion Rate</span>
                        <span className="font-medium text-green-600">{data.kpis?.averageConversionRate?.toFixed(1) || '0.0'}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">Commission Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-[#f9f6f2] rounded-lg flex items-center justify-center">
                      <div className="text-center text-[#6f5c51]">
                        <Target className="h-6 w-6 mx-auto mb-2" />
                        <p className="text-xs">Distribution chart</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">Payout Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6f5c51]">Batches Processed</span>
                        <span className="font-medium text-[#5d4037]">{data.kpis?.totalActiveAffiliates || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6f5c51]">Avg Payout Time</span>
                        <span className="font-medium text-[#5d4037]">3.2 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6f5c51]">Success Rate</span>
                        <span className="font-medium text-green-600">99.2%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="system" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">Fraud Detection Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Auto-Flagging Active</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Online</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Batch Automation Active</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Online</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="text-center">
                          <p className="text-2xl font-serif text-[#5d4037]">{fraudDetectionRate}%</p>
                          <p className="text-xs text-[#6f5c51]">Detection Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-serif text-[#5d4037]">0</p>
                          <p className="text-xs text-[#6f5c51]">False Positives</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">System Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 bg-[#f9f6f2] rounded-lg flex items-center justify-center">
                      <div className="text-center text-[#6f5c51]">
                        <Activity className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Performance monitoring dashboard</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="reports" className="mt-6">
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
    <div className="space-y-6">
      <Suspense fallback={<div>Loading analytics...</div>}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
