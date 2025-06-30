-- RPC Functions Test Script
-- Created: 2025-06-30
-- Tests RPC functions with user ID: 8f8f67ff-7a2c-4515-82d1-214bb8807932

-- Variables
\set test_user_id '8f8f67ff-7a2c-4515-82d1-214bb8807932'

-- Helper function to print test results with clear formatting
CREATE OR REPLACE FUNCTION _test_output(test_name TEXT, result JSONB)
RETURNS VOID AS $$
BEGIN
  RAISE NOTICE '--------------------------------------------';
  RAISE NOTICE 'TEST: %', test_name;
  RAISE NOTICE '--------------------------------------------';
  RAISE NOTICE '%', result;
  RAISE NOTICE ' ';
END;
$$ LANGUAGE plpgsql;

-- Set auth.uid() for testing (this simulates an authenticated user session)
-- For Supabase SQL Editor testing, we need to use the service_role to execute these
-- This is ONLY for testing and debugging
CREATE OR REPLACE FUNCTION set_auth_uid(uid uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid::text, false);
END;
$$ LANGUAGE plpgsql;

-- Begin testing
DO $$
BEGIN
  -- Set auth context to the test user
  PERFORM set_auth_uid(:'test_user_id'::uuid);
  
  -- Test 1: Check if user is admin
  PERFORM _test_output(
    'is_admin() - Check if user is admin',
    to_jsonb(rpc.is_admin())
  );
  
  -- Test 2: Get basic enrollment data
  PERFORM _test_output(
    'get_student_enrollment_data() - Fetch basic enrollments',
    rpc.get_student_enrollment_data(:'test_user_id'::uuid)
  );
  
  -- Test 3: Get detailed enrollment data with modules and lessons
  PERFORM _test_output(
    'get_student_detailed_enrollment_data() - Fetch detailed enrollments',
    rpc.get_student_detailed_enrollment_data(:'test_user_id'::uuid)
  );
  
  -- Test 4: Get lesson progress
  PERFORM _test_output(
    'get_student_lesson_progress() - Fetch lesson progress',
    rpc.get_student_lesson_progress(:'test_user_id'::uuid)
  );
  
  -- Test 5: Get course progress
  PERFORM _test_output(
    'get_student_course_progress() - Fetch course progress',
    rpc.get_student_course_progress(:'test_user_id'::uuid)
  );
  
  -- Test 6: Get all dashboard data
  PERFORM _test_output(
    'get_student_dashboard_data() - Fetch all dashboard data',
    rpc.get_student_dashboard_data(:'test_user_id'::uuid)
  );
  
  -- Test 7: Compare with direct table access for validation
  PERFORM _test_output(
    'Direct query - Enrollments (for comparison)',
    (SELECT json_agg(
      json_build_object(
        'id', e.id,
        'user_id', e.user_id,
        'course_id', e.course_id,
        'status', e.status,
        'enrolled_at', e.enrolled_at,
        'courses', json_build_object(
          'id', c.id,
          'title', c.title,
          'description', c.description,
          'slug', c.slug
        )
      )
    )
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = :'test_user_id'::uuid
    ORDER BY e.enrolled_at DESC)
  );
  
END $$;

-- Clean up test helper (optional)
DROP FUNCTION IF EXISTS _test_output(TEXT, JSONB);

-- Additional API endpoint test option
-- To test through a NextJS API endpoint, create a file like:
-- app/api/test/rpc-functions/route.ts with this content:

/*
import { createServerSupabaseClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const testUserId = '8f8f67ff-7a2c-4515-82d1-214bb8807932';
  
  // Run all tests and collect results
  const results = {
    enrollments: await supabase.rpc('get_student_enrollment_data', { p_user_id: testUserId }),
    detailedEnrollments: await supabase.rpc('get_student_detailed_enrollment_data', { p_user_id: testUserId }),
    lessonProgress: await supabase.rpc('get_student_lesson_progress', { p_user_id: testUserId }),
    courseProgress: await supabase.rpc('get_student_course_progress', { p_user_id: testUserId }),
    dashboardData: await supabase.rpc('get_student_dashboard_data', { p_user_id: testUserId }),
    isAdmin: await supabase.rpc('is_admin', { p_user_id: testUserId }),
  };
  
  return NextResponse.json(results);
}
*/
