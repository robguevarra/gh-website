import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminHeading } from '@/components/admin/admin-heading';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: "Edit User | Admin Dashboard",
  description: "View and edit user profile, membership, courses, and settings",
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  
  // Fetch user profile data
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  // Fetch user membership data
  const { data: memberships, error: membershipError } = await supabase
    .from('user_memberships')
    .select(`
      *,
      membership_tiers (
        id,
        name,
        description,
        price,
        interval,
        features
      )
    `)
    .eq('user_id', id);
  
  // Fetch membership tiers for dropdown
  const { data: membershipTiers } = await supabase
    .from('membership_tiers')
    .select('*')
    .order('price');
  
  // Fetch roles for dropdown
  const { data: roles } = await supabase
    .from('roles')
    .select('*');
  
  // If user not found, return 404
  if (userError || !user) {
    notFound();
  }
  
  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/users">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <AdminHeading 
          title={user.full_name || 'User Profile'} 
          description={`Manage user profile and settings for ${user.email}`}
        />
        
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/users/${id}/impersonate`}>
              Impersonate
            </Link>
          </Button>
          <Button variant="destructive" asChild>
            <Link href={`/admin/users/${id}/delete`}>
              Delete User
            </Link>
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">User Profile</h3>
            <div className="text-sm text-muted-foreground">
              <p>User profile editing functionality will be implemented here.</p>
              <p>This will include name, email, bio, and other profile fields.</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="membership" className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Membership</h3>
            <div className="text-sm text-muted-foreground">
              <p>Membership management functionality will be implemented here.</p>
              <p>This will allow changing membership tier, status, and viewing payment history.</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="courses" className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Courses</h3>
            <div className="text-sm text-muted-foreground">
              <p>Course enrollment management will be implemented here.</p>
              <p>This will show enrolled courses and allow managing course access.</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Security</h3>
            <div className="text-sm text-muted-foreground">
              <p>Security management functionality will be implemented here.</p>
              <p>This will include password reset, account locking, and activity logs.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 