import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Metadata } from 'next';
import { ArrowLeft, UserCog } from 'lucide-react';
import Link from 'next/link';

import { UserProfileForm } from '@/components/admin/user-profile-form';
import { UserMembershipForm } from '@/components/admin/user-membership-form';
import { UserCourses } from '@/components/admin/user-courses';
import { UserSecurityForm } from '@/components/admin/user-security-form';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'User Details | Admin',
  description: 'User details and management page',
};

export default async function UserDetailPage({
  params,
}: {
  params: { id: string }
}) {
  // Create Supabase clients - standard and service role
  const supabase = await createServerSupabaseClient();
  const serviceClient = await createServiceRoleClient();
  
  // Fetch user details including auth data from service client (bypasses RLS)
  const { data: user, error: userError } = await serviceClient
    .from('auth.users')
    .select('*, profile:profiles(*)')
    .eq('id', params.id)
    .single();

  if (userError || !user) {
    console.error('Error fetching user:', userError);
    notFound();
  }

  // Fetch membership tiers for the membership form
  const { data: membershipTiers } = await supabase
    .from('membership_tiers')
    .select('*')
    .order('price_monthly', { ascending: true });

  // Fetch user's current membership
  const { data: membership } = await serviceClient
    .from('memberships')
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch user's enrolled courses with course details
  const { data: userCourses } = await serviceClient
    .from('user_courses')
    .select('*, course:courses(*)')
    .eq('user_id', params.id);

  // Fetch all available courses for enrollment options
  const { data: allCourses } = await supabase
    .from('courses')
    .select('*')
    .order('title');

  // Fetch available user roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('*')
    .order('name');

  // Create user profile data structure
  const userProfile = {
    id: params.id,
    first_name: user.profile?.first_name || null,
    last_name: user.profile?.last_name || null,
    email: user.email,
    phone: user.profile?.phone || null,
    role: user.profile?.role || 'user',
  };

  // Define default roles if none are found in the database
  const defaultRoles = [
    { id: '1', name: 'user', description: 'Regular user' },
    { id: '2', name: 'admin', description: 'Administrator' },
    { id: '3', name: 'moderator', description: 'Content moderator' },
  ];

  return (
    <div className="container py-8 space-y-6">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            <UserCog className="inline-block mr-2 h-8 w-8" />
            User Details
          </h1>
          <p className="text-muted-foreground">
            {user.profile?.first_name
              ? `${user.profile.first_name} ${user.profile.last_name || ''}`
              : user.email}
          </p>
        </div>
      </div>

      {/* User management tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <UserProfileForm 
            user={userProfile}
            roles={roles || defaultRoles}
          />
        </TabsContent>

        <TabsContent value="membership" className="space-y-4">
          <UserMembershipForm 
            userId={params.id}
            membership={membership}
            membershipTiers={membershipTiers || []}
          />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <UserCourses 
            userId={params.id}
            userCourses={userCourses || []}
            availableCourses={allCourses || []}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <UserSecurityForm 
            userId={params.id}
            user={{
              id: params.id,
              email: user.email,
              email_confirmed_at: user.email_confirmed_at,
              last_sign_in_at: user.last_sign_in_at,
              created_at: user.created_at,
              updated_at: user.updated_at,
              profile: user.profile,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 