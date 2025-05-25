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
        // Try unified_profiles first (this is our main user table)
        const { data: unifiedProfile, error: unifiedError } = await supabase
          .from('unified_profiles')
          .select('id, first_name, last_name, phone, email')
          .eq('id', userId)
          .maybeSingle();
        
        if (!unifiedError && unifiedProfile) {
          // Return profile in expected format
          return {
            id: unifiedProfile.id,
            first_name: unifiedProfile.first_name,
            last_name: unifiedProfile.last_name,
            full_name: unifiedProfile.first_name && unifiedProfile.last_name 
              ? `${unifiedProfile.first_name} ${unifiedProfile.last_name}`.trim()
              : unifiedProfile.first_name || unifiedProfile.last_name || null,
            phone: unifiedProfile.phone,
            email: unifiedProfile.email,
            avatar_url: null, // We don't store avatars in unified_profiles yet
            role: 'user', // Default role 
            preferences: null
          };
        }
          
        // Only fall back to profiles table if unified_profiles doesn't have the user
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone, avatar_url, role, preferences')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('Profile fetch error:', error.message);
          return null;
        }
        
        // Add full_name if we have first/last name
        if (data) {
          return {
            ...data,
            full_name: data.first_name && data.last_name 
              ? `${data.first_name} ${data.last_name}`.trim()
              : data.first_name || data.last_name || null
          };
        }
        
        return data;
      } catch (err) {
        console.error('Profile fetch exception:', err instanceof Error ? err.message : String(err));
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
        .from('enrollments')
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
        // Check profiles table first for admin role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', userId)
          .maybeSingle();
        
        if (!profileError && profile) {
          if (profile.role === 'admin' || profile.is_admin === true) {
            return { isAdmin: true };
          }
        }
        
        // If not found in profiles, check unified_profiles for admin tag
        const { data: unifiedProfile, error: unifiedError } = await supabase
          .from('unified_profiles')
          .select('tags')
          .eq('id', userId)
          .maybeSingle();
        
        if (!unifiedError && unifiedProfile?.tags && Array.isArray(unifiedProfile.tags)) {
          if (unifiedProfile.tags.includes('admin')) {
            return { isAdmin: true };
          }
        }
        
        return { isAdmin: false };
      } catch (err) {
        console.error('Admin status check exception:', err instanceof Error ? err.message : String(err));
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