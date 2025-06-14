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

export const metadata: Metadata = {
  title: "Analytics & Reports | Admin",
  description: "Performance metrics, financial reports, and system insights for affiliate program management",
};

async function AnalyticsContent() {
  // TODO: Implement data fetching for analytics
  // For now, using placeholder data following the established patterns
  
  const mockData = {
    totalRevenue: 15420.50,
    totalCommissions: 2313.08,
    activeAffiliates: 23,
    conversionRate: 4.2,
    fraudDetectionRate: 2.1,
    batchesProcessed: 8,
    avgPayoutTime: 5.2,
    topPerformingAffiliates: [
      { name: "Sarah Johnson", conversions: 45, commission: 675.00 },
      { name: "Mike Chen", conversions: 38, commission: 570.00 },
      { name: "Emma Davis", conversions: 32, commission: 480.00 },
    ]
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#e9e0d8] bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f5c51] font-medium">Total Revenue</p>
                <p className="text-2xl font-serif text-[#5d4037]">₱{mockData.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">+12.5% from last month</p>
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
                <p className="text-2xl font-serif text-[#5d4037]">₱{mockData.totalCommissions.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">+8.3% from last month</p>
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
                <p className="text-2xl font-serif text-[#5d4037]">{mockData.activeAffiliates}</p>
                <p className="text-xs text-[#9ac5d9] mt-1">{mockData.conversionRate}% avg conversion rate</p>
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
                <p className="text-sm text-[#6f5c51] font-medium">System Health</p>
                <p className="text-2xl font-serif text-[#5d4037]">98.7%</p>
                <p className="text-xs text-green-600 mt-1">{mockData.fraudDetectionRate}% fraud detection rate</p>
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
                      {mockData.topPerformingAffiliates.map((affiliate, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#f9f6f2] rounded-lg">
                          <div>
                            <p className="font-medium text-[#5d4037]">{affiliate.name}</p>
                            <p className="text-sm text-[#6f5c51]">{affiliate.conversions} conversions</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-[#b08ba5]">₱{affiliate.commission.toLocaleString()}</p>
                            <Badge variant="secondary" className="text-xs">
                              #{index + 1}
                            </Badge>
                          </div>
                        </div>
                      ))}
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
                    <div className="h-32 bg-[#f9f6f2] rounded-lg flex items-center justify-center">
                      <div className="text-center text-[#6f5c51]">
                        <DollarSign className="h-6 w-6 mx-auto mb-2" />
                        <p className="text-xs">Revenue chart</p>
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
                        <span className="font-medium text-[#5d4037]">{mockData.batchesProcessed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6f5c51]">Avg Payout Time</span>
                        <span className="font-medium text-[#5d4037]">{mockData.avgPayoutTime} days</span>
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
                          <p className="text-2xl font-serif text-[#5d4037]">{mockData.fraudDetectionRate}%</p>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">Export Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button 
                        className="w-full bg-[#b08ba5] hover:bg-[#b08ba5]/90 text-white justify-start"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Monthly Performance Report
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-[#e9e0d8] hover:bg-[#f9f6f2] justify-start"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Financial Summary Report
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-[#e9e0d8] hover:bg-[#f9f6f2] justify-start"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Affiliate Activity Report
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-[#e9e0d8] hover:bg-[#f9f6f2] justify-start"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Fraud Detection Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#e9e0d8]">
                  <CardHeader>
                    <CardTitle className="text-md font-medium text-[#5d4037]">Scheduled Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-[#f9f6f2] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-[#5d4037]">Weekly Summary</p>
                          <p className="text-xs text-[#6f5c51]">Every Monday at 9:00 AM</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#f9f6f2] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-[#5d4037]">Monthly Financial</p>
                          <p className="text-xs text-[#6f5c51]">1st of each month</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full border-[#e9e0d8] hover:bg-[#f9f6f2]"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Manage Schedules
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
