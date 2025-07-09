import { Suspense } from 'react';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Users, 
  BarChart2, 
  CreditCard, 
  Settings, 
  TrendingUp, 
  Target, 
  Package
} from 'lucide-react';

// Dashboard Sections
//import { AdminHeader } from '@/components/admin/admin-header';
import { DashboardOverview } from '@/components/admin/dashboard-overview';
import { EnrollmentsSection } from '@/components/admin/enrollments-section';
import { RevenueSection } from '@/components/admin/revenue-section';
import MarketingAnalyticsContent from '@/app/admin/marketing/MarketingAnalyticsContent';
import EmailAnalyticsDashboard from '@/components/admin/email-analytics-dashboard';

//import { RevenueAnalysis } from '@/components/admin/revenue-analysis';
//import { MarketingInsights } from '@/components/admin/marketing-insights';

export const metadata = {
  title: 'Admin Dashboard | Graceful Homeschooling',
  description: 'Business intelligence dashboard for enrollment tracking, revenue analysis, and marketing insights.',
};

export default async function AdminDashboardPage() {
  // SSR/data fetching will be added here as dashboard grows
  // Zustand store setup will be integrated for state management
  return (
    <div className="space-y-8">
      {/* AdminHeader is rendered globally in the admin layout. */}
      {/* Dashboard title and description */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Business Intelligence Dashboard</h2>
        <p className="text-muted-foreground">Real-time analytics for enrollment tracking, revenue analysis, and business performance insights</p>
      </div>
            {/* Award-winning tab navigation for dashboard sections */}
      <Tabs defaultValue="overview" className="space-y-8">
        {/* Mobile-first responsive tab design */}
        <div className="w-full">
          <TabsList className="flex p-1 bg-muted/50 rounded-lg w-full h-auto">
            {/* Mobile: Horizontal scroll layout */}
            <div className="flex md:hidden w-full overflow-x-auto scrollbar-hide">
              <div className="flex space-x-1 px-2 py-1 min-w-max">
                <TabsTrigger 
                  value="overview" 
                  className="flex items-center justify-center gap-2 min-w-[90px] px-4 py-3 text-sm font-medium rounded-md transition-all whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <BarChart2 className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="enrollments" 
                  className="flex items-center justify-center gap-2 min-w-[90px] px-4 py-3 text-sm font-medium rounded-md transition-all whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Users className="h-4 w-4" />
                  <span>Enrollments</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="revenue" 
                  className="flex items-center justify-center gap-2 min-w-[90px] px-4 py-3 text-sm font-medium rounded-md transition-all whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Revenue</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="marketing" 
                  className="flex items-center justify-center gap-2 min-w-[90px] px-4 py-3 text-sm font-medium rounded-md transition-all whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Marketing</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="email" 
                  className="flex items-center justify-center gap-2 min-w-[90px] px-4 py-3 text-sm font-medium rounded-md transition-all whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <BarChart2 className="h-4 w-4" />
                  <span>Email</span>
                </TabsTrigger>
              </div>
            </div>
            
            {/* Desktop: Grid layout */}
            <div className="hidden md:grid md:grid-cols-5 w-full gap-1">
              <TabsTrigger 
                value="overview" 
                className="flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="enrollments" 
                className="flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Users className="h-4 w-4" />
                <span>Enrollments</span>
              </TabsTrigger>
              <TabsTrigger 
                value="revenue" 
                className="flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                <span>Revenue</span>
              </TabsTrigger>
              <TabsTrigger 
                value="marketing" 
                className="flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Marketing</span>
              </TabsTrigger>
              <TabsTrigger 
                value="email" 
                className="flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Email</span>
              </TabsTrigger>
            </div>
          </TabsList>
        </div>
    
        <TabsContent value="overview">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardOverview />
          </Suspense>
        </TabsContent>
        <TabsContent value="enrollments">
          <Suspense fallback={<DashboardSkeleton />}>
            <EnrollmentsSection />
          </Suspense>
        </TabsContent>
        
        {/* Connect the new Revenue Section */}
        <TabsContent value="revenue">
          <Suspense fallback={<DashboardSkeleton />}>
            <RevenueSection />
          </Suspense>
        </TabsContent>
        {/* Add Marketing TabsContent */}
        <TabsContent value="marketing">
          <Suspense fallback={<DashboardSkeleton />}> 
            <MarketingAnalyticsContent />
          </Suspense>
        </TabsContent>
        {/* Add Email Analytics TabsContent */}
        <TabsContent value="email">
          <Suspense fallback={<DashboardSkeleton />}>
            <EmailAnalyticsDashboard />
          </Suspense>
        </TabsContent>



      </Tabs>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}