import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminHeading } from '@/components/admin/admin-heading';
import { Settings, Users, MessageSquare, Bell, Shield, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Settings | Admin Dashboard',
  description: 'Manage system settings and configuration',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminHeading 
          title="System Settings" 
          description="Manage your platform configuration and preferences"
        />
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">User Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
              <CardDescription>
                Manage general site information and appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="site-name">Site Name</Label>
                <Input id="site-name" defaultValue="Graceful Homeschooling" />
                <p className="text-sm text-muted-foreground">
                  The name of your site displayed in the browser tab and emails
                </p>
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="site-description">Site Description</Label>
                <Textarea 
                  id="site-description" 
                  defaultValue="Graceful Homeschooling - Christian homeschooling resources and community"
                />
                <p className="text-sm text-muted-foreground">
                  Used for SEO and sharing on social media
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>
                Take your site offline for maintenance or updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, regular users will see a maintenance message
                  </p>
                </div>
                <Switch id="maintenance-mode" />
              </div>
              
              <div className="grid gap-3 pt-2">
                <Label htmlFor="maintenance-message">Maintenance Message</Label>
                <Textarea 
                  id="maintenance-message" 
                  defaultValue="We're currently performing scheduled maintenance. Please check back soon!" 
                />
                <p className="text-sm text-muted-foreground">
                  The message users will see during maintenance
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Date and Time Settings</CardTitle>
              <CardDescription>
                Configure date and time display preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="timezone">Default Timezone</Label>
                <select id="timezone" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="US/Pacific">US/Pacific</option>
                  <option value="US/Eastern">US/Eastern</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Manila">Asia/Manila</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  The default timezone for displaying dates and times
                </p>
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="date-format">Date Format</Label>
                <select id="date-format" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  How dates will be displayed throughout the platform
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registration Settings</CardTitle>
              <CardDescription>
                Configure how users can register and sign up
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-registration">Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable new user registration
                  </p>
                </div>
                <Switch id="allow-registration" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="email-verification">Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify their email before accessing the platform
                  </p>
                </div>
                <Switch id="email-verification" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="admin-approval">Require Admin Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    New users must be approved by an administrator
                  </p>
                </div>
                <Switch id="admin-approval" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Default User Settings</CardTitle>
              <CardDescription>
                Configure default settings for new users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="default-role">Default User Role</Label>
                <select id="default-role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="user">User</option>
                  <option value="member">Member</option>
                  <option value="contributor">Contributor</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  Role assigned to new users upon registration
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure system email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="welcome-email">Welcome Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Send a welcome email to new users
                  </p>
                </div>
                <Switch id="welcome-email" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="password-reset">Password Reset Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Email users when their password is reset
                  </p>
                </div>
                <Switch id="password-reset" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="system-updates">System Update Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify administrators about system updates
                  </p>
                </div>
                <Switch id="system-updates" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Admin Notifications</CardTitle>
              <CardDescription>
                Configure notifications for administrators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-user-notif">New User Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify admins when a new user registers
                  </p>
                </div>
                <Switch id="new-user-notif" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-notif">Payment Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify admins about payment events
                  </p>
                </div>
                <Switch id="payment-notif" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="system-error-notif">System Error Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts for system errors and issues
                  </p>
                </div>
                <Switch id="system-error-notif" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>
                Configure requirements for user passwords
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="min-length">Minimum Password Length</Label>
                <Input id="min-length" type="number" defaultValue="8" min="6" max="32" />
                <p className="text-sm text-muted-foreground">
                  Minimum number of characters required in passwords
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="require-special">Require Special Characters</Label>
                  <p className="text-sm text-muted-foreground">
                    Passwords must contain at least one special character
                  </p>
                </div>
                <Switch id="require-special" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="require-numbers">Require Numbers</Label>
                  <p className="text-sm text-muted-foreground">
                    Passwords must contain at least one number
                  </p>
                </div>
                <Switch id="require-numbers" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Authentication Settings</CardTitle>
              <CardDescription>
                Configure authentication methods and security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="social-login">Social Login</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to sign in with social media accounts
                  </p>
                </div>
                <Switch id="social-login" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="session-timeout">Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically log users out after period of inactivity
                  </p>
                </div>
                <Switch id="session-timeout" defaultChecked />
              </div>
              
              <div className="grid gap-3 pt-2">
                <Label htmlFor="timeout-duration">Timeout Duration (minutes)</Label>
                <Input id="timeout-duration" type="number" defaultValue="60" min="5" max="1440" />
                <p className="text-sm text-muted-foreground">
                  Number of minutes before an inactive session expires
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                View system information and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">System Version</h3>
                  <p className="text-sm text-muted-foreground">1.0.0</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Database Status</h3>
                  <div className="flex items-center">
                    <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Node Environment</h3>
                  <p className="text-sm text-muted-foreground">production</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Storage Status</h3>
                  <div className="flex items-center">
                    <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Legacy Data Integration</CardTitle>
              <CardDescription>
                Manage integration with legacy system data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="xendit-status">Xendit Integration</Label>
                <div className="flex items-center">
                  <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="text-sm">Connected - {`10`} records</p>
                </div>
              </div>
              
              <div className="grid gap-3 pt-2">
                <Label htmlFor="systemeio-status">Systemeio Integration</Label>
                <div className="flex items-center">
                  <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="text-sm">Connected - {`15`} records</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-legacy">Automatic Synchronization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync data from legacy systems
                  </p>
                </div>
                <Switch id="sync-legacy" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" className="mr-2">
                <Database className="mr-2 h-4 w-4" />
                Run Manual Sync
              </Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 