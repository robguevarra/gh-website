/**
 * Student Dashboard Data Access Adapter
 * 
 * This adapter layer provides a consistent interface for dashboard data access
 * while enabling feature-flagged switching between direct table access and RPC functions.
 * 
 * Part of the phased migration to RPC-based access for improved security and maintainability.
 */

import { getBrowserClient } from '@/lib/supabase/client';
import { createServerSupabaseClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

// Define types for our dashboard data
type EnrollmentData = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  expires_at: string | null;
  courses: {
    id: string;
    title: string;
    description: string;
    slug: string;
  };
};

type DetailedEnrollmentData = {
  status: string;
  course: {
    id: string;
    title: string;
    description: string;
    slug: string;
    modules: Array<{
      id: string;
      title: string;
      course_id: string;
      lessons: Array<{
        id: string;
        title: string;
        module_id: string;
      }>;
    }>;
  };
};

type LessonProgressData = {
  lesson_id: string;
  status: string;
  progress_percentage: number;
  last_position: number;
  updated_at: string;
};

type CourseProgressData = {
  course_id: string;
  progress_percentage: number;
  updated_at: string;
};

type DashboardData = {
  enrollments: DetailedEnrollmentData[];
  lessonProgress: LessonProgressData[];
  courseProgress: CourseProgressData[];
};

// Use type assertion to workaround TypeScript limitations with dynamic RPC calls
function callRpcFunction<T>(supabase: SupabaseClient, functionName: string, params?: Record<string, any>): Promise<{
  data: T | null;
  error: any;
}> {
  return (supabase.rpc as any)(functionName, params);
}

// Feature flags for gradual rollout - these could be moved to environment variables 
// or a feature flag service in a production environment
const USE_RPC_FEATURES = {
  enrollments: process.env.NEXT_PUBLIC_USE_RPC_ENROLLMENTS === 'true',
  progress: process.env.NEXT_PUBLIC_USE_RPC_PROGRESS === 'true',
  dashboardAll: process.env.NEXT_PUBLIC_USE_RPC_DASHBOARD === 'true',
};

/**
 * Get student enrollments with course data
 * 
 * @param userId The user ID to fetch enrollments for
 * @param isServer Whether this is being called from server-side code
 * @returns Promise with enrollments data and error if any
 */
export async function getStudentEnrollments(userId: string, isServer = false) {
  const supabase = isServer ? createServerSupabaseClient() : getBrowserClient();
  
  if (USE_RPC_FEATURES.dashboardAll || USE_RPC_FEATURES.enrollments) {
    // RPC-based approach
    const { data, error } = await callRpcFunction<EnrollmentData[]>(
      supabase, 
      'get_student_enrollment_data', 
      { p_user_id: userId }
    );
    
    return { data: data || [], error };
  } else {
    // Direct table access approach
    return await supabase
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          slug
        )
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });
  }
}

/**
 * Get detailed enrollments with course, module, and lesson data
 * 
 * @param userId The user ID to fetch detailed enrollment data for
 * @param isServer Whether this is being called from server-side code
 * @returns Promise with detailed enrollment data and error if any
 */
export async function getStudentDetailedEnrollments(userId: string, isServer = false) {
  const supabase = isServer ? createServerSupabaseClient() : getBrowserClient();
  
  if (USE_RPC_FEATURES.dashboardAll || USE_RPC_FEATURES.enrollments) {
    // RPC-based approach
    const { data, error } = await callRpcFunction<DetailedEnrollmentData[]>(
      supabase, 
      'get_student_detailed_enrollment_data', 
      { p_user_id: userId }
    );
    
    return { data: data || [], error };
  } else {
    // Direct table access approach
    return await supabase
      .from('enrollments')
      .select(`
        status,
        course: courses (
          id, title, description, slug,
          modules (
            id, title, course_id, 
            lessons (id, title, module_id)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');
  }
}

/**
 * Get student lesson progress data
 * 
 * @param userId The user ID to fetch lesson progress for
 * @param isServer Whether this is being called from server-side code
 * @returns Promise with lesson progress data and error if any
 */
export async function getStudentLessonProgress(userId: string, isServer = false) {
  const supabase = isServer ? createServerSupabaseClient() : getBrowserClient();
  
  if (USE_RPC_FEATURES.dashboardAll || USE_RPC_FEATURES.progress) {
    // RPC-based approach
    const { data, error } = await callRpcFunction<LessonProgressData[]>(
      supabase, 
      'get_student_lesson_progress', 
      { p_user_id: userId }
    );
    
    return { data: data || [], error };
  } else {
    // Direct table access approach
    return await supabase
      .from('user_progress')
      .select('lesson_id, status, progress_percentage, last_position, updated_at')
      .eq('user_id', userId);
  }
}

/**
 * Get student course progress data
 * 
 * @param userId The user ID to fetch course progress for
 * @param isServer Whether this is being called from server-side code
 * @returns Promise with course progress data and error if any
 */
export async function getStudentCourseProgress(userId: string, isServer = false) {
  const supabase = isServer ? createServerSupabaseClient() : getBrowserClient();
  
  if (USE_RPC_FEATURES.dashboardAll || USE_RPC_FEATURES.progress) {
    // RPC-based approach
    const { data, error } = await callRpcFunction<CourseProgressData[]>(
      supabase, 
      'get_student_course_progress', 
      { p_user_id: userId }
    );
    
    return { data: data || [], error };
  } else {
    // Direct table access approach
    return await supabase
      .from('course_progress')
      .select('course_id, progress_percentage')
      .eq('user_id', userId);
  }
}

/**
 * Get all dashboard data in a single call (optimized)
 * 
 * @param userId The user ID to fetch dashboard data for
 * @param isServer Whether this is being called from server-side code
 * @returns Promise with all dashboard data and error if any
 */
export async function getAllDashboardData(userId: string, isServer = false) {
  const supabase = isServer ? createServerSupabaseClient() : getBrowserClient();
  
  if (USE_RPC_FEATURES.dashboardAll) {
    // Single RPC call for all dashboard data
    const { data, error } = await callRpcFunction<DashboardData>(
      supabase, 
      'get_student_dashboard_data', 
      { p_user_id: userId }
    );
    
    if (error) {
      console.error('Error fetching dashboard data:', error);
      return { 
        enrollments: [], 
        lessonProgress: [], 
        courseProgress: [],
        error 
      };
    }
    
    return {
      enrollments: data?.enrollments || [],
      lessonProgress: data?.lessonProgress || [],
      courseProgress: data?.courseProgress || [],
      error: null
    };
  } else {
    // Make individual calls and combine results
    const [enrollmentsResult, lessonProgressResult, courseProgressResult] = await Promise.all([
      getStudentDetailedEnrollments(userId, isServer),
      getStudentLessonProgress(userId, isServer),
      getStudentCourseProgress(userId, isServer)
    ]);
    
    return {
      enrollments: enrollmentsResult.data || [],
      lessonProgress: lessonProgressResult.data || [],
      courseProgress: courseProgressResult.data || [],
      error: enrollmentsResult.error || lessonProgressResult.error || courseProgressResult.error || null
    };
  }
}

/**
 * Check if the current user is an admin
 * 
 * @param userId Optional user ID to check (defaults to current auth user)
 * @param isServer Whether this is being called from server-side code
 * @returns Promise with boolean result and error if any
 */
export async function isUserAdmin(userId?: string, isServer = false) {
  const supabase = isServer ? createServerSupabaseClient() : getBrowserClient();
  
  const params = userId ? { p_user_id: userId } : {};
  const { data, error } = await callRpcFunction<boolean>(
    supabase, 
    'is_admin', 
    params
  );
  
  return { isAdmin: data || false, error };
}
