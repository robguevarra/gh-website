import { cookies } from 'next/headers';
import Link from 'next/link';
import { type Database } from '@/types/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import UserTable from '@/components/admin/user-table';
import { AdminHeading } from '@/components/admin/admin-heading';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Manage Users | Admin Dashboard',
  description: 'View and manage all user accounts in the platform.',
};

export default async function UsersPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const pageSize = 10;
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const role = typeof searchParams.role === 'string' ? searchParams.role : '';

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      created_at,
      role,
      user_memberships (
        id,
        status,
        membership_tier_id,
        membership_tiers (
          name
        )
      )
    `, { count: 'exact' });

  // Apply search filter if provided
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Apply role filter if provided
  if (role) {
    query = query.eq('role', role);
  }

  // Execute query with pagination
  const { data: users, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // Get total pages
  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminHeading
          title="Users"
          description="Manage user accounts, permissions, and profile information."
        />
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New User
          </Link>
        </Button>
      </div>
      
      <UserTable 
        users={users || []} 
        search={search}
        role={role}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
} 