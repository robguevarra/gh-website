import { redirect } from 'next/navigation';
import type { Database } from '@/types/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

import AdminSidebar from '@/components/admin/admin-sidebar';
import AdminHeader from '@/components/admin/admin-header';

export const metadata = {
  title: 'Admin Dashboard | Graceful Homeschooling',
  description: 'Administrative dashboard for managing Graceful Homeschooling platform content and users.',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create a Supabase client for server components
  const supabase = await createServerSupabaseClient();
  
  // Get the current user - this is more secure than getSession()
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('Auth check result:', { user: user?.id, error: error?.message });
  
  // If no authenticated user, redirect to sign in
  if (error || !user) {
    console.log('No authenticated user, redirecting to sign in');
    redirect('/auth/signin?callbackUrl=/admin');
  }
  
  // Use service role client to bypass RLS for admin checks
  // This avoids the infinite recursion issue with RLS policies
  const serviceClient = createServiceRoleClient();
  
  // Get the user's profile to check if they are an admin
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log('Profile check result:', { 
    profile: profile ? { id: profile.id, role: profile.role, is_admin: profile.is_admin } : null, 
    error: profileError?.message 
  });
  
  // If user is not an admin, redirect to dashboard
  if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
    console.log('User does not have admin privileges, redirecting to dashboard');
    redirect('/dashboard');
  }
  
  console.log('Admin access granted');
  
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <div className="flex flex-1 flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 