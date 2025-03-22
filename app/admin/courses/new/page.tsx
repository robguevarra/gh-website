import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import CourseForm from '@/components/admin/course-form';

export const metadata = {
  title: 'Create New Course | Admin Dashboard',
  description: 'Create a new course for the Graceful Homeschooling platform.',
};

export default async function NewCoursePage() {
  // Use service role client to bypass RLS for admin operations
  const serviceClient = createServiceRoleClient();
  
  // Debug auth check
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user?.id || '')
    .single();
  
  console.log('New Course Page Auth Check:', {
    isAuthenticated: !!user,
    userId: user?.id,
    role: profile?.role,
    isAdmin: profile?.is_admin
  });
  
  // Fetch membership tiers for the form
  const { data: membershipTiers } = await serviceClient
    .from('membership_tiers')
    .select('id, name, description')
    .order('price_monthly', { ascending: true });
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Course</h1>
        <p className="text-muted-foreground mt-2">
          Add a new course to your platform. Fill out the basic information, then add modules and lessons.
        </p>
      </div>
      
      <CourseForm membershipTiers={membershipTiers || []} />
    </div>
  );
} 