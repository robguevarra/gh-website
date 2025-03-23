import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Database } from '@/types/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminHeading } from '@/components/admin/admin-heading';
import {
  BarChart4,
  BookOpen,
  CreditCard,
  Settings,
  Users,
  Tag,
  BarChart2,
  Plus,
  ArrowRight,
  UserPlus,
  BarChart,
  DollarSign,
  Clock,
  ArrowUpRight,
  Shield,
  BookOpenCheck,
} from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard | Graceful Homeschooling',
  description: 'Administrative dashboard for managing Graceful Homeschooling platform.',
};

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  
  // Fetch key metrics from database
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true });
  
  const { count: activeMemberships } = await supabase
    .from('user_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  // Fetch legacy data from xendit table
  const { data: xenditData, count: transactionCount } = await supabase
    .from('xendit')
    .select('*', { count: 'exact' });
  
  // Calculate payment metrics from xendit
  const successfulPayments = xenditData?.filter(item => item.status === 'PAID').length || 0;
  const paymentSuccessRate = transactionCount ? Math.round((successfulPayments / transactionCount) * 100) : 0;
  
  // Calculate total revenue from successful payments
  const totalRevenue = xenditData
    ?.filter(item => item.status === 'PAID')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;
  
  // Get contact count from systemeio
  const { count: contactCount } = await supabase
    .from('systemeio')
    .select('*', { count: 'exact', head: true });
  
  // Calculate conversion rate (paid users vs total contacts)
  const conversionRate = contactCount ? Math.round((successfulPayments / contactCount) * 100) : 0;
  
  // Format counts for display
  const formatCount = (count: number | null) => {
    if (count === null) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };
  
  // Define metrics for display
  const metrics = [
    {
      title: 'Total Users',
      value: formatCount(userCount),
      description: 'Registered users',
      icon: Users,
      color: 'text-blue-500',
      link: '/admin/users',
    },
    {
      title: 'Courses',
      value: formatCount(courseCount),
      description: 'Active courses',
      icon: BookOpen,
      color: 'text-green-500',
      link: '/admin/courses',
    },
    {
      title: 'Transactions',
      value: formatCount(transactionCount),
      description: `${successfulPayments} successful payments`,
      icon: DollarSign,
      color: 'text-yellow-500',
      link: '/admin/reports/financial',
    },
    {
      title: 'Total Revenue',
      value: `₱${totalRevenue.toLocaleString()}`,
      description: 'From paid transactions',
      icon: DollarSign,
      color: 'text-emerald-500',
      link: '/admin/reports/financial',
    },
    {
      title: 'Success Rate',
      value: `${paymentSuccessRate}%`,
      description: 'Payment completion rate',
      icon: ArrowUpRight,
      color: 'text-purple-500',
      link: '/admin/reports/financial',
    },
    {
      title: 'Contacts',
      value: formatCount(contactCount),
      description: 'Total marketing contacts',
      icon: Users,
      color: 'text-indigo-500',
      link: '/admin/reports/users',
    },
    {
      title: 'Conversion',
      value: `${conversionRate}%`,
      description: 'Contact to customer rate',
      icon: ArrowUpRight,
      color: 'text-pink-500',
      link: '/admin/reports/users',
    },
    {
      title: 'Active Memberships',
      value: formatCount(activeMemberships),
      description: 'Current subscribers',
      icon: Shield,
      color: 'text-blue-500',
      link: '/admin/users',
    },
  ];
  
  const quickActions = [
    {
      title: "Create New User",
      description: "Add a new user to the platform",
      icon: Users,
      href: "/admin/users/new",
    },
    {
      title: "Create New Course",
      description: "Add a new course to the platform",
      icon: BookOpen,
      href: "/admin/courses/new",
    },
    {
      title: "Manage Memberships",
      description: "Update, add or remove membership tiers",
      icon: Tag,
      href: "/admin/memberships",
    },
    {
      title: "View Reports",
      description: "See analytics and platform reports",
      icon: BarChart2,
      href: "/admin/reports",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminHeading
        title="Admin Dashboard"
        description="Overview of your platform's performance and key metrics."
      />
      
      {/* Main Metrics Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Key Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.slice(0, 8).map((metric) => (
            <Card key={metric.title}>
              <Link href={metric.link} className="block h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Create User</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Add a new user to the system
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild size="sm" className="w-full">
                <Link href="/admin/users/new">Create User</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Course</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Create a new course or program
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild size="sm" className="w-full">
                <Link href="/admin/courses/new">Create Course</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">View Reports</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Access detailed system reports
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild size="sm" className="w-full">
                <Link href="/admin/reports">View Reports</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settings</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Manage system settings and your profile
              </p>
            </CardContent>
            <CardFooter>
              <div className="flex w-full gap-2">
                <Button asChild size="sm" variant="outline" className="w-1/2">
                  <Link href="/admin/profile">Profile</Link>
                </Button>
                <Button asChild size="sm" className="w-1/2">
                  <Link href="/admin/settings">Settings</Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Recent Activity</h2>
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest payment activity from Xendit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {xenditData?.slice(0, 5).map((transaction, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{transaction.description || 'Payment'}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.email || 'Unknown email'} • {new Date(transaction.created).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      transaction.status === 'PAID' 
                        ? 'bg-green-100 text-green-800' 
                        : transaction.status === 'EXPIRED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.status}
                    </span>
                    <div className="ml-4 font-medium">₱{parseFloat(transaction.amount || '0').toLocaleString()}</div>
                  </div>
                </div>
              ))}
              
              {(!xenditData || xenditData.length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  No recent transactions found
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <Link href="/admin/reports/financial">
                View All Transactions <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* System Status */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">System Status</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Data Integration</CardTitle>
              <CardDescription>
                Status of legacy data systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span>Xendit Integration</span>
                  </div>
                  <span className="text-sm text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span>Systeme.io Integration</span>
                  </div>
                  <span className="text-sm text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                    <span>Data Migration</span>
                  </div>
                  <span className="text-sm text-yellow-600">Pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>
                Current system metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Database Status</span>
                  <span className="text-sm text-green-600">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>API Response Time</span>
                  <span className="text-sm">120ms (avg)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Storage Usage</span>
                  <span className="text-sm">42%</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm" className="ml-auto">
                <Link href="/admin/settings">
                  System Settings <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 