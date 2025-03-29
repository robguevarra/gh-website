import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import AdminHeader from '@/components/admin/admin-header';
import AdminSidebar from '@/components/admin/admin-sidebar';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Admin Dashboard | Graceful Homeschooling',
  description: 'Administrative dashboard for managing Graceful Homeschooling platform content and users.',
};

// Revalidate the page every 60 seconds
export const revalidate = 60;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Get the request headers for proper session handling
    const requestHeaders = await headers();
    const pathname = requestHeaders.get('x-pathname') || '/admin';
    
    // Create a Supabase client for server components
    const supabase = await createServerSupabaseClient();
    
    // Get the authenticated user directly from the Auth server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Handle authentication errors
    if (userError) {
      console.error('Authentication error:', userError);
      redirect(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}&error=auth_error`);
    }
    
    if (!user) {
      console.log('No authenticated user, redirecting to sign in');
      redirect(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
    }
    
    // Check if user is an admin
    const isAdmin = await validateAdminStatus(user.id);
    
    if (!isAdmin) {
      console.log('User does not have admin privileges');
      // Store the attempted admin access in analytics
      await supabase
        .from('admin_access_attempts')
        .insert({
          user_id: user.id,
          email: user.email,
          attempted_path: pathname,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();
      
      redirect('/dashboard?error=insufficient_permissions');
    }
    
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AdminHeader />
        <div className="flex flex-1 flex-col md:flex-row">
          <AdminSidebar />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Critical error in admin layout:', error);
    // Log the error to your error tracking service
    
    // Redirect to error page for critical failures
    redirect('/error?type=admin_layout');
  }
} 