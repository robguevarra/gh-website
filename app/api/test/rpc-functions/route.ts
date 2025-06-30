/**
 * RPC Functions Test API
 * 
 * This API endpoint helps test the new RPC functions we created
 * for the dashboard data access migration.
 */

import { createServerSupabaseClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

// Define custom RPC function types to resolve TypeScript errors
interface CustomRpcFunctions {
  get_student_enrollment_data: (args: { p_user_id: string }) => Promise<{ data: any; error: any }>;
  get_student_detailed_enrollment_data: (args: { p_user_id: string }) => Promise<{ data: any; error: any }>;
  get_student_lesson_progress: (args: { p_user_id: string }) => Promise<{ data: any; error: any }>;
  get_student_course_progress: (args: { p_user_id: string }) => Promise<{ data: any; error: any }>;
  get_student_dashboard_data: (args: { p_user_id: string }) => Promise<{ data: any; error: any }>;
  is_admin: (args?: { p_user_id?: string }) => Promise<{ data: boolean; error: any }>;
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const testUserId = '8f8f67ff-7a2c-4515-82d1-214bb8807932';
    
    // Use a type assertion to help TypeScript recognize our custom RPC functions
    const customRpc = supabase as unknown as SupabaseClient & CustomRpcFunctions;
    
    // Run all tests and collect results
    const results = {
      // Basic enrollment data
      enrollments: await customRpc.rpc('get_student_enrollment_data', { 
        p_user_id: testUserId 
      }) as any,
      
      // Detailed enrollment data with modules and lessons
      detailedEnrollments: await customRpc.rpc('get_student_detailed_enrollment_data', { 
        p_user_id: testUserId 
      }) as any,
      
      // Lesson progress
      lessonProgress: await customRpc.rpc('get_student_lesson_progress', { 
        p_user_id: testUserId 
      }) as any,
      
      // Course progress
      courseProgress: await customRpc.rpc('get_student_course_progress', { 
        p_user_id: testUserId 
      }) as any,
      
      // Full dashboard data
      dashboardData: await customRpc.rpc('get_student_dashboard_data', { 
        p_user_id: testUserId 
      }) as any,
      
      // Admin check
      isAdmin: await customRpc.rpc('is_admin', { 
        p_user_id: testUserId 
      }),
      
      // Direct query comparison for enrollment data
      directEnrollments: await supabase
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
        .eq('user_id', testUserId)
        .order('enrolled_at', { ascending: false }),
    };
    
    return NextResponse.json({
      success: true,
      message: 'RPC function tests completed',
      results
    });
  } catch (error) {
    console.error('Error testing RPC functions:', error);
    return NextResponse.json({
      success: false,
      message: 'Error testing RPC functions',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
