import { createServerSupabaseClient } from '@/lib/supabase/server'; 
import type { User } from '@supabase/supabase-js';

interface AdminAccessResult {
  isAdmin: boolean;
  error: string | null;
  status: number;
  user: User | null;
}

export async function checkAdminAccess(): Promise<AdminAccessResult> {
  const supabase = await createServerSupabaseClient(); 

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('Error fetching user for admin check:', authError);
    return { isAdmin: false, error: 'Authentication check failed', status: 500, user: null };
  }

  if (!user) {
    return { isAdmin: false, error: 'User not authenticated', status: 401, user: null };
  }

  const isAdmin = user.user_metadata?.is_admin === true;

  if (!isAdmin) {
    return { isAdmin: false, error: 'Admin access required', status: 403, user };
  }

  return { isAdmin: true, error: null, status: 200, user };
}
