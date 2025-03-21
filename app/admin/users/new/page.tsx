import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { AdminHeading } from '@/components/admin/admin-heading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: "Add User | Admin Dashboard",
  description: "Create a new user account in the platform",
};

export default async function CreateUserPage() {
  const supabase = await createServerSupabaseClient();
  
  // Fetch roles for the role selection dropdown
  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .order('name');
    
  // Fetch membership tiers for the membership selection dropdown
  const { data: membershipTiers } = await supabase
    .from('membership_tiers')
    .select('*')
    .order('price');
  
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
      
      <AdminHeading
        title="Create New User"
        description="Add a new user to the platform and set up their account details"
      />
      
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            Enter the new user's details. They'll receive an email to set their password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground p-4 border rounded-md">
            <p>Create user form will be implemented here.</p>
            <p>Form will include fields for:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Email address</li>
              <li>Full name</li>
              <li>Role selection</li>
              <li>Initial membership tier (optional)</li>
              <li>Send welcome email toggle</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 