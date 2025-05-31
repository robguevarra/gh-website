/**
 * Admin Security Page
 * Provides security monitoring and management for administrators
 */

import { Metadata } from 'next';
import { SecurityStatus } from '@/components/security/security-status';
import { SecurityNotificationDemo } from '@/components/security/security-notification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Lock, AlertTriangle, Settings, Bell } from 'lucide-react';

// Metadata for the page
export const metadata: Metadata = {
  title: 'Security Dashboard | Admin',
  description: 'Monitor and manage security settings',
};

/**
 * Admin Security Page Component
 */
export default function AdminSecurityPage() {
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex items-center mb-8">
        <Shield className="h-8 w-8 mr-3 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage security settings for your application
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Security Logs</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Authentication
                </CardTitle>
                <CardDescription>Authentication security status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">Rate limiting</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">CSRF protection</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">Secure cookies</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">Suspicious activity detection</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security Headers
                </CardTitle>
                <CardDescription>HTTP security headers status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">Content-Security-Policy</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">X-XSS-Protection</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">X-Frame-Options</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">Strict-Transport-Security</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Recent Alerts
                </CardTitle>
                <CardDescription>Recent security alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No recent alerts</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <SecurityStatus />
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Notifications</CardTitle>
              <CardDescription>
                Manage and preview security notifications for users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <SecurityStatus />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Notification Preview</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Preview how security notifications will appear to users. Click the buttons below to generate sample notifications.
                  </p>
                  <SecurityNotificationDemo />
                </div>
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-2">Notification Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure which security events trigger notifications for users. Advanced notification settings will be available in a future update.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security settings for your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Security settings configuration will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Logs</CardTitle>
              <CardDescription>
                View security-related logs and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Security logs will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
