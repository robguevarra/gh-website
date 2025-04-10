'use client';

import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { user, profile } = useAuth();

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Welcome to Your Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your homeschooling journey with Graceful Homeschooling
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your profile and account details</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{user?.email}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {profile ? `${profile.first_name || ''} ${profile.last_name || ''}` : 'Complete your profile'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
            <CardDescription>Access your enrolled courses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You haven't enrolled in any courses yet.
            </p>
            <Button variant="link" className="px-0" onClick={() => {}}>
              Browse courses
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership</CardTitle>
            <CardDescription>Your current membership plan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Free Membership
            </p>
            <Button variant="link" className="px-0" onClick={() => {}}>
              Upgrade your membership
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 