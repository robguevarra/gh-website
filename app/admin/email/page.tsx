/**
 * Email Admin Page
 * 
 * This page serves as the main entry point for email management in the admin portal.
 * It provides access to:
 * - Email templates
 * - Campaign management
 * - Email analytics
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, FileEdit, BarChart3, Settings, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Email Management | Admin Dashboard',
  description: 'Manage email campaigns, templates, and analytics',
};

export default function EmailAdminPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Email Management</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Email Templates Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileEdit className="h-5 w-5 text-primary" />
              <CardTitle>Email Templates</CardTitle>
            </div>
            <CardDescription>
              Manage and edit your email templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Create and modify email templates for various purposes including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authentication emails</li>
              <li>Transactional notifications</li>
              <li>Marketing campaigns</li>
              <li>Educational content</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/admin/email-templates" className="w-full">
              <Button className="w-full" variant="outline">
                <FileEdit className="h-4 w-4 mr-2" />
                Manage Templates
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Campaigns Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Send className="h-5 w-5 text-primary" />
              <CardTitle>Campaigns</CardTitle>
            </div>
            <CardDescription>
              Create and schedule email campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Build targeted email campaigns for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Course announcements</li>
              <li>Special promotions</li>
              <li>Newsletters</li>
              <li>Educational series</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/admin/email/campaigns" className="w-full">
              <Button className="w-full" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Manage Campaigns
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Segmentation Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>User Segments</CardTitle>
            </div>
            <CardDescription>
              Create and manage user segments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Target specific user groups based on:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>User attributes</li>
              <li>Behavioral tags</li>
              <li>Engagement history</li>
              <li>Custom criteria</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/admin/email/segmentation" className="w-full">
              <Button className="w-full" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Segments
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Analytics Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Analytics</CardTitle>
            </div>
            <CardDescription>
              Track email performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Monitor key email metrics:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Open rates</li>
              <li>Click-through rates</li>
              <li>Conversion tracking</li>
              <li>Audience engagement</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/admin/email/analytics" className="w-full">
              <Button className="w-full" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>Email Settings</CardTitle>
            </div>
            <CardDescription>
              Configure your email service settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
                <TabsTrigger value="automations">Automations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="mt-4 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Email Service</h3>
                  <p className="text-sm text-muted-foreground">
                    Connected to Postmark - All email delivery is handled through Postmark services
                  </p>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Sender Details</h3>
                  <p className="text-sm text-muted-foreground">
                    From: Graceful Homeschooling &lt;support@gracefulhomeschooling.com&gt;
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reply-To: support@gracefulhomeschooling.com
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="delivery" className="mt-4 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Domain Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    SPF, DKIM, and DMARC records are properly configured for gracefulhomeschooling.com
                  </p>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Delivery Limits</h3>
                  <p className="text-sm text-muted-foreground">
                    Current plan: Postmark Broadcast - Up to 100,000 emails per month
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="automations" className="mt-4 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Active Automations</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li>Welcome Series (4 emails)</li>
                    <li>Course Reminders (24 hours before class)</li>
                    <li>Re-engagement (30 days inactive)</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Link href="/admin/email/settings" className="w-full">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Manage Settings
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
