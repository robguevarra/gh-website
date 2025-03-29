'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from './client';
import type { Database } from '@/types/supabase';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/auth-context';

// Type for Supabase realtime subscription
type SubscriptionCallback<T> = (payload: { new: T; old: T | null }) => void;

// Hook for fetching data from Supabase
export function useSupabaseQuery<T>(
  queryFn: (supabase: ReturnType<typeof createBrowserSupabaseClient>) => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const result = await queryFn(supabase);
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err instanceof Error ? err.message : JSON.stringify(err));
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, deps);

  return { data, error, isLoading };
}

// Hook for real-time subscriptions
export function useRealtimeSubscription<T extends Record<string, any>>(
  table: keyof Database['public']['Tables'],
  callback: SubscriptionCallback<T>,
  filter?: {
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
  }
) {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    
    const channel = supabase.channel('table-changes');
    
    channel
      .on(
        'postgres_changes' as any,
        {
          event: filter?.event || '*',
          schema: 'public',
          table: table as string,
          filter: filter?.filter,
        },
        (payload: { new: T; old: T | null }) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback, filter]);
}

// Hook for user profile
export function useUserProfile(userId: string | undefined) {
  return useSupabaseQuery(
    async (supabase) => {
      if (!userId) return null;
      
      try {
        // Use a more targeted query with only the fields we need
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone, avatar_url, role, preferences, is_admin')
          .eq('id', userId)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') { // Not found is not a real error
            console.error('Profile fetch error:', error.message);
          }
          return null;
        }
        return data;
      } catch (err) {
        // Return null instead of throwing to prevent component errors
        return null;
      }
    },
    [userId]
  );
}

// Hook for fetching courses
export function useCourses(options?: {
  featured?: boolean;
  limit?: number;
  publishedOnly?: boolean;
}) {
  return useSupabaseQuery(
    async (supabase) => {
      let query = supabase.from('courses').select('*, membership_tiers(name)');
      
      if (options?.publishedOnly) {
        query = query.eq('status', 'published');
      }
      
      if (options?.featured) {
        query = query.eq('is_featured', true);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    [options?.featured, options?.limit, options?.publishedOnly]
  );
}

// Hook for fetching a single course by slug
export function useCourse(slug: string | undefined) {
  return useSupabaseQuery(
    async (supabase) => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('courses')
        .select('*, membership_tiers(name, price_monthly, price_yearly)')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data;
    },
    [slug]
  );
}

// Hook for user enrollments
export function useUserEnrollments(userId: string | undefined) {
  return useSupabaseQuery(
    async (supabase) => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_enrollments')
        .select('*, courses(id, title, slug, thumbnail_url)')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
    [userId]
  );
}

// Hook for user membership
export function useUserMembership(userId: string | undefined) {
  return useSupabaseQuery(
    async (supabase) => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_memberships')
        .select('*, membership_tiers(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
      return data || null;
    },
    [userId]
  );
}

// Hook for user lesson progress
export function useUserLessonProgress(userId: string | undefined, lessonId: string | undefined) {
  return useSupabaseQuery(
    async (supabase) => {
      if (!userId || !lessonId) return null;
      
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
      return data || null;
    },
    [userId, lessonId]
  );
}

// Hook for updating user lesson progress
export function useUpdateUserProgress() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const updateProgress = async (
    userId: string,
    lessonId: string,
    progress: Partial<Database['public']['Tables']['user_progress']['Update']>
  ) => {
    if (!userId || !lessonId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createBrowserSupabaseClient();
      
      // Check if progress exists
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();
      
      let result;
      
      if (existingProgress) {
        // Update existing progress
        const { data, error } = await supabase
          .from('user_progress')
          .update(progress)
          .eq('id', existingProgress.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new progress
        const { data, error } = await supabase
          .from('user_progress')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            ...progress
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      return result;
    } catch (err) {
      console.error('Error updating progress:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { updateProgress, isLoading, error };
}

// Specialized hook for checking admin status without depending on profiles table
export function useAdminStatus(userId: string | undefined) {
  return useSupabaseQuery(
    async (supabase) => {
      if (!userId) return { isAdmin: false };
      
      try {
        // Simplified admin check - try profile first as it's most reliable
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .single();
        
        if (!profileError && profile) {
          return { isAdmin: !!profile.is_admin };
        }
        
        // Fallback to RPC function
        const { data, error } = await supabase
          .rpc('check_if_user_is_admin', { user_id: userId });
        
        if (!error) {
          return { isAdmin: !!data };
        }
        
        return { isAdmin: false };
      } catch (err) {
        return { isAdmin: false };
      }
    },
    [userId]
  );
}

// Specialized hook for admin data fetching that bypasses RLS
export function useAdminData<T>(
  queryFn: (supabase: ReturnType<typeof createBrowserSupabaseClient>) => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    // Only fetch data if user is admin
    if (!isAdmin) {
      setError(new Error('Unauthorized'));
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const supabase = createBrowserSupabaseClient();
        
        // First try with regular client
        try {
          const result = await queryFn(supabase);
          setData(result);
          setError(null);
          setIsLoading(false);
          return;
        } catch (err) {
          // If this is a policy recursion error, try with service client
          if (err instanceof Error && 
             (err.message.includes('infinite recursion') || 
              err.message.includes('42P17'))) {
            
            // Import dynamically to avoid issues in SSR
            const { createServiceRoleClient } = await import('./service-client');
            const serviceClient = createServiceRoleClient();
            
            // Run the same query with service client
            const result = await queryFn(serviceClient);
            setData(result);
            setError(null);
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.error('Error fetching admin data:', err instanceof Error ? err.message : JSON.stringify(err));
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [...deps, isAdmin]);

  return { data, error, isLoading };
} 