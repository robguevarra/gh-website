import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Activity, UsersRound, BookOpen, DollarSign, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: 'Reports | Admin Dashboard',
  description: 'View and analyze platform data and metrics',
};

export default async function ReportsPage() {
  // Use service role client to bypass RLS for admin reporting
  const supabase = createServiceRoleClient();
  
  // Fetch key counts
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true });
  
  // Calculate payment conversion from xendit data
  const { count: totalPaymentAttempts } = await supabase
    .from('xendit')
    .select('*', { count: 'exact', head: true });
    
  const { count: successfulPayments } = await supabase
    .from('xendit')
    .select('*', { count: 'exact', head: true })
    .eq('Status', 'PAID');
  
  // Calculate conversion rate
  const conversionRate = (totalPaymentAttempts || 0) > 0
    ? ((successfulPayments || 0) / (totalPaymentAttempts || 0)) * 100
    : 0;
  
  // Simple revenue calculation (this would be more complex in a real system)
  const { data: revenueData } = await supabase
    .from('xendit')
    .select('Amount')
    .eq('Status', 'PAID');
  
  const totalRevenue = revenueData?.reduce((sum: number, item: { Amount: number | null }) => 
    sum + (Number(item.Amount) || 0), 0) || 0;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            View and analyze your platform metrics and performance
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Reports</TabsTrigger>
          <TabsTrigger value="financial">Financial Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <UsersRound className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered users on the platform
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Courses
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courseCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Available courses on the platform
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Payment conversion rate
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Total platform revenue
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity Overview</CardTitle>
                <CardDescription>
                  Summary of recent platform activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-md">
                  <p className="text-muted-foreground">Activity chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>
                  Recent user registrations and logins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-md">
                  <p className="text-muted-foreground">User activity will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Reports</CardTitle>
              <CardDescription>
                Detailed user registration and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">User reports will be displayed here</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button asChild>
                <Link href="/admin/reports/users">View Detailed User Reports</Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Revenue, transactions, and payment metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">Financial reports will be displayed here</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button asChild>
                <Link href="/admin/reports/financial">View Detailed Financial Reports</Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 