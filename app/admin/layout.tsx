import { redirect } from 'next/navigation';
import type { Database } from '@/types/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
  try {
    // Create a Supabase client for server components
    const supabase = await createServerSupabaseClient();
    
    // Get the current session and user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('No valid session, redirecting to sign in');
      redirect('/auth/signin?callbackUrl=/admin');
    }
    
    // Get the current user from the session
    const { user } = session;
    
    if (!user) {
      console.log('No authenticated user, redirecting to sign in');
      redirect('/auth/signin?callbackUrl=/admin');
    }
    
    // Use service role client to bypass RLS for admin checks
    const serviceClient = await createServiceRoleClient();
    
    // Get the user's profile to check if they are an admin
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, is_admin')
      .eq('id', user.id)
      .single();
    
    console.log('Profile check result:', { 
      profile: profile ? { id: profile.id, isAdmin: profile.is_admin } : null, 
      error: profileError?.message 
    });
    
    // If user is not an admin, redirect to dashboard
    if (!profile || !profile.is_admin) {
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
  } catch (error) {
    console.error('Error in admin layout:', error);
    redirect('/auth/signin?callbackUrl=/admin');
  }
} 