import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import AdminHeader from '@/components/admin/admin-header';

export const metadata: Metadata = {
  title: 'Admin Reports | Good Habits',
  description: 'View reports and analytics for your organization',
};

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create a Supabase client for server components
  const supabase = await createServerSupabaseClient();
  
  // Get the current user
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // If no authenticated user, redirect to sign in
  if (error || !user) {
    redirect('/auth/signin?callbackUrl=/admin/reports');
  }
  
  // Use service role client to bypass RLS for admin checks
  const serviceClient = createServiceRoleClient();
  
  // Get the user's profile to check if they are an admin
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  // If user is not an admin, redirect to dashboard
  if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <div className="flex-1 container mx-auto p-4 md:p-6">
        {children}
      </div>
    </div>
  );
} 