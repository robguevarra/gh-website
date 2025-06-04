'use client';

import { DashboardLayout } from '@/components/affiliate/dashboard/dashboard-layout';
import { PerformanceMetricsCard } from '@/components/affiliate/dashboard/performance-metrics-card';
import { PerformanceChart } from '@/components/affiliate/dashboard/analytics/performance-chart';
import { LinkPerformanceComparison } from '@/components/affiliate/dashboard/analytics/link-performance-comparison';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, BarChart3, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAffiliateMetricsData } from '@/lib/hooks/use-affiliate-dashboard';
import { useState, useEffect } from 'react';

export default function PerformancePage() {
  const { metrics, isLoadingMetrics, loadAffiliateMetrics } = useAffiliateMetricsData();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  useEffect(() => {
    if (loadAffiliateMetrics) {
      loadAffiliateMetrics(timeRange);
    }
  }, [timeRange, loadAffiliateMetrics]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Track and analyze your affiliate performance metrics
          </p>
        </div>

        <PerformanceMetricsCard />

        <Tabs defaultValue="clicks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto">
            <TabsTrigger value="clicks">Clicks</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="links">Link Performance</TabsTrigger>
          </TabsList>
          
          {/* Clicks Tab */}
          <TabsContent value="clicks">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                  <CardDescription>
                    All time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {metrics?.totalClicks || 0}
                    </span>
                    <span className="text-xs flex items-center text-green-600">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +12.3%
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recent Daily Average</CardTitle>
                  <CardDescription>
                    Last {timeRange}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {Math.round((metrics?.totalClicks || 0) * 0.07)}
                    </span>
                    <span className="text-xs flex items-center text-green-600">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +5.8%
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <CardDescription>
                    Current total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {Math.round((metrics?.totalClicks || 0) * 0.03)}
                    </span>
                    <span className="text-xs flex items-center text-red-600">
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                      -2.4%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <PerformanceChart />
          </TabsContent>

          {/* Conversions Tab */}
          <TabsContent value="conversions">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
                  <CardDescription>
                    All time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {metrics?.totalConversions || 0}
                    </span>
                    <span className="text-xs flex items-center text-green-600">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +8.7%
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <CardDescription>
                    Average
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {((metrics?.conversionRate || 0) * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs flex items-center text-green-600">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +1.5%
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recent Conversions</CardTitle>
                  <CardDescription>
                    Last 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {Math.round((metrics?.totalConversions || 0) * 0.12)}
                    </span>
                    <span className="text-xs flex items-center text-red-600">
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                      -3.1%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <PerformanceChart />
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <CardDescription>
                    All time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-green-600">
                      ${(metrics?.totalEarnings || 0).toFixed(2)}
                    </span>
                    <span className="text-xs flex items-center text-green-600">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +15.2%
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                  <CardDescription>
                    Per conversion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      ${(metrics?.averageOrderValue || 0).toFixed(2)}
                    </span>
                    <span className="text-xs flex items-center text-green-600">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +4.5%
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
                  <CardDescription>
                    Current month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-green-600">
                      ${((metrics?.totalEarnings || 0) * 0.12).toFixed(2)}
                    </span>
                    <span className="text-xs flex items-center text-green-600">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +18.5%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <PerformanceChart />
          </TabsContent>

          {/* Link Performance Tab */}
          <TabsContent value="links">
            <LinkPerformanceComparison />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
