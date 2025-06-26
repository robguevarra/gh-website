import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Create a Supabase client with admin privileges using the service role key
// This should be used ONLY in server contexts (Server Components, Route Handlers, Server Actions)
// NEVER expose this client to the browser
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase URL or Service Role Key');
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-admin-access': 'true'
        }
      }
    }
  );
};

// Create a singleton instance for admin operations
let adminClient: ReturnType<typeof createAdminClient>;

export function getAdminClient() {
  if (!adminClient) {
    adminClient = createAdminClient();
  }
  return adminClient;
}

// Helper function to validate admin status
export async function validateAdminStatus(userId: string) {
  const admin = getAdminClient();
  
  try {
    const { data: profile, error } = await admin
      .from('unified_profiles')
      .select('is_admin, status')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Admin validation error:', error);
      return false;
    }
    
    // User must be admin and have active status
    return profile?.is_admin === true && profile?.status === 'active';
  } catch (err) {
    console.error('Admin validation exception:', err);
    return false;
  }
}

// Safe admin operations with error handling
export const adminDb = {
  // User management operations
  users: {
    // Get a user by ID with full profile
    async getById(userId: string) {
      try {
        const { data, error } = await getAdminClient().auth.admin.getUserById(userId);
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching user by ID:', error);
        return { data: null, error };
      }
    },
    
    // Update user data
    async update(userId: string, userData: any) {
      try {
        const { data, error } = await getAdminClient().auth.admin.updateUserById(
          userId,
          userData
        );
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error updating user:', error);
        return { data: null, error };
      }
    },
    
    // Delete a user by ID
    async delete(userId: string) {
      try {
        const { data, error } = await getAdminClient().auth.admin.deleteUser(userId);
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error deleting user:', error);
        return { data: null, error };
      }
    }
  },
  
  // Course management operations
  courses: {
    async getById(courseId: string) {
      try {
        const { data, error } = await getAdminClient()
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
          
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching course by ID:', error);
        return { data: null, error };
      }
    },
    
    async getModules(courseId: string) {
      try {
        const { data, error } = await getAdminClient()
          .from('modules')
          .select('*')
          .eq('course_id', courseId)
          .order('position');
          
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching course modules:', error);
        return { data: null, error };
      }
    }
  }
};

// Export administrative functions for data management
export { setupAdminUser } from './admin-setup'; 