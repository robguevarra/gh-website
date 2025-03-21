import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Database } from '@/types/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminHeading } from '@/components/admin/admin-heading';
import {
  Users,
  BookOpen,
  Tag,
  BarChart4,
  Plus,
  ArrowRight,
  CreditCard,
  Settings,
} from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard | Graceful Homeschooling',
  description: 'Administrative dashboard for managing Graceful Homeschooling platform.',
};

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  
  // Fetch counts for key metrics
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true });
  
  const { count: membershipCount } = await supabase
    .from('user_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  const { count: transactionCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
  
  // Format counts for display
  const metricsData = [
    {
      title: 'Total Users',
      value: formatCount(userCount),
      description: 'Registered users',
      icon: Users,
      color: 'bg-blue-100',
      link: '/admin/users'
    },
    {
      title: 'Courses',
      value: formatCount(courseCount),
      description: 'Published and drafts',
      icon: BookOpen,
      color: 'bg-amber-100',
      link: '/admin/courses'
    },
    {
      title: 'Active Memberships',
      value: formatCount(membershipCount),
      description: 'Paying subscribers',
      icon: Tag,
      color: 'bg-green-100',
      link: '/admin/memberships'
    },
    {
      title: 'Transactions',
      value: formatCount(transactionCount),
      description: 'Total processed',
      icon: CreditCard,
      color: 'bg-purple-100',
      link: '/admin/transactions'
    },
  ];
  
  const quickActions = [
    {
      title: 'Add new user',
      description: 'Create a new user account',
      icon: Users,
      link: '/admin/users/new',
    },
    {
      title: 'Create course',
      description: 'Add a new course to the platform',
      icon: BookOpen,
      link: '/admin/courses/new',
    },
    {
      title: 'Manage memberships',
      description: 'View and edit membership tiers',
      icon: Tag,
      link: '/admin/memberships',
    },
    {
      title: 'View reports',
      description: 'See platform analytics and reports',
      icon: BarChart4,
      link: '/admin/reports',
    },
  ];

  // Format count values
  function formatCount(count: number | null): string {
    return count !== null ? count.toString() : '0';
  }
  
  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminHeading
          title="Admin Dashboard"
          description="Overview of your platform and key metrics"
        />
        <Button asChild>
          <Link href="/admin/settings">
            <Settings className="mr-2 h-4 w-4" />
            System Settings
          </Link>
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsData.map((metric) => (
          <Card key={metric.title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
              <div className="mt-4">
                <Link
                  href={metric.link}
                  className="text-xs text-primary hover:underline inline-flex items-center"
                >
                  View Details
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-12">
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="overflow-hidden">
              <Link href={action.link} className="block h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription>{action.description}</CardDescription>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest activity across your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">No recent activity to display</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href="/admin/activity">
                  View All Activity
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current platform status and issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage</span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Authentication</span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  Healthy
                </span>
              </div>
              <Button variant="outline" asChild className="mt-4 w-full">
                <Link href="/admin/settings/system">
                  View System Settings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 