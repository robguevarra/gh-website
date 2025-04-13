'use client';

import { useCallback, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/types/user';

/**
 * Custom hook for fetching user profile data from Supabase
 * 
 * This hook handles fetching user profile data from the database.
 * It manages loading and error states and provides methods for
 * fetching and refreshing the data.
 * 
 * @param userId - The ID of the user to fetch (optional)
 * @returns An object containing the fetched data, loading state, error state, and refresh function
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refresh } = useFetchUserProfile(userId);
 * ```
 */
export function useFetchUserProfile(userId?: string | null) {
  const supabase = getBrowserClient();
  const [data, setData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch user profile data from Supabase
   */
  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      setData(profileData);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId]);

  /**
   * Fetch the current authenticated user's profile
   */
  const fetchCurrentUserProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session?.user) {
        throw new Error(authError?.message || 'Not authenticated');
      }

      const currentUserId = session.user.id;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (profileError) {
        throw profileError;
      }

      setData(profileData);
      return { userId: currentUserId, profile: profileData };
    } catch (err) {
      console.error('Error fetching current user profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return {
    data,
    isLoading,
    error,
    fetchProfile,
    fetchCurrentUserProfile
  };
}
