import { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AdminHeading } from '@/components/admin/admin-heading';
import { User, Mail, Shield, Key, BellRing, Loader } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Admin Profile | Good Habits',
  description: 'Manage your administrator profile',
};

// Loading component
function LoadingState() {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="text-center">
        <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading profile information...</p>
      </div>
    </div>
  );
}

// The server component that handles data fetching
async function AdminProfileContent() {
  const supabase = await createServerSupabaseClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get the user's profile information
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();
  
  // Generate initials for avatar fallback
  const getInitials = () => {
    if (!profile) return 'AD';
    return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
  };
  
  return (
    <div className="space-y-6">
      <AdminHeading
        title="Your Profile"
        description="Manage your administrator account and preferences"
      />
      
      <div className="flex flex-col gap-6 md:flex-row">
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Admin Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="Profile" />
              ) : (
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              )}
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-medium">
                {profile?.first_name} {profile?.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="mt-2 flex items-center justify-center">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  Administrator
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Upload New Photo
            </Button>
          </CardContent>
        </Card>
        
        <div className="flex-1">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your basic profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input 
                        id="first-name" 
                        defaultValue={profile?.first_name || ''}
                        placeholder="Your first name" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input 
                        id="last-name" 
                        defaultValue={profile?.last_name || ''}
                        placeholder="Your last name" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      defaultValue={profile?.email || user?.email || ''}
                      placeholder="Your email address" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      placeholder="Tell us about yourself" 
                      rows={4}
                      defaultValue={profile?.bio || ''}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Update Profile</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>
                    Additional contact methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      defaultValue={profile?.phone || ''}
                      placeholder="Your phone number" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select id="timezone" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="US/Pacific">US/Pacific</option>
                      <option value="US/Eastern">US/Eastern</option>
                      <option value="UTC">UTC</option>
                      <option value="Asia/Manila">Asia/Manila</option>
                    </select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Update Contact Info</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your account password
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Change Password</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Not enabled
                      </p>
                    </div>
                    <Button variant="outline">Setup 2FA</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Configure how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Email Notifications</h3>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify-users" className="flex-1">New User Registrations</Label>
                        <select id="notify-users" className="w-32">
                          <option value="all">All</option>
                          <option value="important">Important Only</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify-payments" className="flex-1">Payment Events</Label>
                        <select id="notify-payments" className="w-32">
                          <option value="all">All</option>
                          <option value="important">Important Only</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify-system" className="flex-1">System Alerts</Label>
                        <select id="notify-system" className="w-32">
                          <option value="all">All</option>
                          <option value="important">Important Only</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Preferences</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="activity" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Login History</CardTitle>
                  <CardDescription>
                    Recent account activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-b pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Current Session</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                          </p>
                        </div>
                        <span className="text-xs text-green-600 bg-green-50 rounded-full px-2 py-1">
                          Active
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        IP: 192.168.1.1 • Chrome on MacOS
                      </p>
                    </div>
                    <div className="border-b pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Previous Login</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(Date.now() - 86400000).toLocaleDateString()} at {new Date(Date.now() - 86400000).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm mt-1">
                        IP: 192.168.1.1 • Chrome on MacOS
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline">View Full History</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>
                    Recent actions performed by your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Account action history will be displayed here in a future update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Main page component that wraps the content in a Suspense boundary
export default function AdminProfilePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      {/* @ts-ignore - This is a valid pattern in Next.js for async server components inside client boundaries */}
      <AdminProfileContent />
    </Suspense>
  );
}