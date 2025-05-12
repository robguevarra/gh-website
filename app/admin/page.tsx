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
import { EnrollmentAnalytics } from '@/components/admin/enrollment-analytics';
import RevenueAnalyticsPage from '@/app/admin/revenue-analytics/page';
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
        <p className="text-muted-foreground">Track enrollments, revenue, and marketing performance</p>
      </div>
      {/* Tab navigation for dashboard sections. Add new sections as needed. */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-5 md:w-auto">
          {/* Tab triggers for each dashboard section */}
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Enrollments</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Marketing</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Email Analytics</span>
          </TabsTrigger>
        </TabsList>
    
        <TabsContent value="overview">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardOverview />
          </Suspense>
        </TabsContent>
        <TabsContent value="enrollments">
          <Suspense fallback={<DashboardSkeleton />}>
            <EnrollmentAnalytics />
          </Suspense>
        </TabsContent>
        
        {/* Connect the new Revenue Analytics page */}
        <TabsContent value="revenue">
          <Suspense fallback={<DashboardSkeleton />}>
            <RevenueAnalyticsPage /> {/* Use the new page component */}
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