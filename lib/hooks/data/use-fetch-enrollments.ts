'use client';

import { useCallback, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { UserEnrollment } from '@/lib/stores/student-dashboard/types';

/**
 * Custom hook for fetching user enrollment data from Supabase
 * 
 * This hook handles fetching user enrollment data from the database.
 * It manages loading and error states and provides methods for
 * fetching and refreshing the data.
 * 
 * @param userId - The ID of the user to fetch enrollments for (optional)
 * @param options - Additional options for the hook
 * @param options.includeExpired - Whether to include expired enrollments (default: false)
 * @returns An object containing the fetched data, loading state, error state, and refresh function
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refresh } = useFetchEnrollments(userId, { includeExpired: true });
 * ```
 */
export function useFetchEnrollments(
  userId?: string | null,
  options: { includeExpired?: boolean } = {}
) {
  const supabase = getBrowserClient();
  const [data, setData] = useState<UserEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { includeExpired = false } = options;

  /**
   * Fetch user enrollment data from Supabase
   */
  const fetchEnrollments = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build the query
      let query = supabase
        .from('enrollments')
        .select(`
          id,
          created_at,
          status,
          expires_at,
          courses (
            id,
            title,
            description,
            thumbnail_url
          )
        `)
        .eq('user_id', userId);
      
      // Add filter for expired enrollments if needed
      if (!includeExpired) {
        const now = new Date().toISOString();
        query = query.or(`expires_at.gt.${now},expires_at.is.null`);
      }
      
      // Execute the query
      const { data: enrollmentData, error: enrollmentError } = await query;

      if (enrollmentError) {
        throw new Error(enrollmentError.message);
      }

      // Map the data to the expected format
      const mappedEnrollments: UserEnrollment[] = enrollmentData.map((enrollment: any) => ({
        id: enrollment.id,
        courseId: enrollment.courses.id,
        courseTitle: enrollment.courses.title,
        courseDescription: enrollment.courses.description,
        courseThumbnail: enrollment.courses.thumbnail_url,
        enrollmentDate: enrollment.created_at,
        status: enrollment.status,
        expiresAt: enrollment.expires_at
      }));

      setData(mappedEnrollments);
      return mappedEnrollments;
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch enrollments'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId, includeExpired]);

  return {
    data,
    isLoading,
    error,
    fetchEnrollments,
    hasEnrollments: data.length > 0,
    enrollmentCount: data.length
  };
}
