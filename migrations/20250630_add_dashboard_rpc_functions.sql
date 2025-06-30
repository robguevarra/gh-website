-- Migration: Add Dashboard RPC Functions
-- Created: 2025-06-30
-- Description: Creates RPC functions for student dashboard data access to improve security and decoupling

-- Step 1: Create the RPC schema if it doesn't exist
-- Functions will be created in public schema
-- We're removing the custom schema approach
-- CREATE SCHEMA IF NOT EXISTS rpc;

-- Step 2: Set appropriate permissions
-- Public schema already has appropriate permissions
-- GRANT USAGE ON SCHEMA rpc TO authenticated;
-- GRANT USAGE ON SCHEMA rpc TO anon;
-- GRANT USAGE ON SCHEMA rpc TO service_role;

-- Step 3: Function for enrollment data
-- Drop function if it already exists
DROP FUNCTION IF EXISTS get_student_enrollment_data(UUID);

CREATE FUNCTION get_student_enrollment_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if caller is the user or an admin
  SELECT EXISTS (
    SELECT 1 FROM unified_profiles 
    WHERE id = auth.uid() AND admin_metadata->'roles' ? 'admin'
  ) INTO is_admin;
  
  -- Authorization check
  IF auth.uid() IS NULL OR (p_user_id != auth.uid() AND NOT is_admin) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Return properly structured data matching what frontend expects
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', e.id,
        'user_id', e.user_id,
        'course_id', e.course_id,
        'status', e.status,
        'enrolled_at', e.enrolled_at,
        'expires_at', e.expires_at,
        'transaction_id', e.transaction_id,
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
    WHERE e.user_id = p_user_id
    ORDER BY e.enrolled_at DESC
  );
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION rpc.get_student_enrollment_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc.get_student_enrollment_data(UUID) TO service_role;

-- Step 4: Function for detailed enrollments with module/lesson data
-- Drop function if it already exists
DROP FUNCTION IF EXISTS get_student_detailed_enrollment_data(UUID);

CREATE FUNCTION get_student_detailed_enrollment_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if caller is the user or an admin
  SELECT EXISTS (
    SELECT 1 FROM unified_profiles 
    WHERE id = auth.uid() AND admin_metadata->'roles' ? 'admin'
  ) INTO is_admin;
  
  -- Authorization check
  IF auth.uid() IS NULL OR (p_user_id != auth.uid() AND NOT is_admin) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Return nested course structure with modules and lessons
  RETURN (
    WITH course_data AS (
      SELECT 
        e.status as enrollment_status,
        c.id as course_id,
        c.title as course_title,
        c.description as course_description,
        c.slug as course_slug,
        json_agg(
          json_build_object(
            'id', m.id,
            'title', m.title,
            'course_id', m.course_id,
            'lessons', (
              SELECT json_agg(
                json_build_object(
                  'id', l.id,
                  'title', l.title,
                  'module_id', l.module_id
                )
              )
              FROM lessons l
              WHERE l.module_id = m.id
              ORDER BY l.position ASC
            )
          ) ORDER BY m.position ASC
        ) as modules
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN modules m ON m.course_id = c.id
      WHERE e.user_id = p_user_id AND e.status = 'active'
      GROUP BY e.status, c.id, c.title, c.description, c.slug
    )
    SELECT json_agg(
      json_build_object(
        'status', cd.enrollment_status,
        'course', json_build_object(
          'id', cd.course_id,
          'title', cd.course_title,
          'description', cd.course_description,
          'slug', cd.course_slug,
          'modules', cd.modules
        )
      )
    )
    FROM course_data cd
  );
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION rpc.get_student_detailed_enrollment_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc.get_student_detailed_enrollment_data(UUID) TO service_role;

-- Step 5: Function for lesson progress data
-- Drop function if it already exists
DROP FUNCTION IF EXISTS get_student_lesson_progress(UUID);

CREATE FUNCTION get_student_lesson_progress(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if caller is the user or an admin
  SELECT EXISTS (
    SELECT 1 FROM unified_profiles 
    WHERE id = auth.uid() AND admin_metadata->'roles' ? 'admin'
  ) INTO is_admin;
  
  -- Authorization check
  IF auth.uid() IS NULL OR (p_user_id != auth.uid() AND NOT is_admin) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Return lesson progress data
  RETURN (
    SELECT json_agg(
      json_build_object(
        'lesson_id', up.lesson_id,
        'status', up.status,
        'progress_percentage', up.progress_percentage,
        'last_position', up.last_position,
        'updated_at', up.updated_at
      )
    )
    FROM user_progress up
    WHERE up.user_id = p_user_id
  );
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION rpc.get_student_lesson_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc.get_student_lesson_progress(UUID) TO service_role;

-- Step 6: Function for course progress data
-- Drop function if it already exists
DROP FUNCTION IF EXISTS get_student_course_progress(UUID);

CREATE FUNCTION get_student_course_progress(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if caller is the user or an admin
  SELECT EXISTS (
    SELECT 1 FROM unified_profiles 
    WHERE id = auth.uid() AND admin_metadata->'roles' ? 'admin'
  ) INTO is_admin;
  
  -- Authorization check
  IF auth.uid() IS NULL OR (p_user_id != auth.uid() AND NOT is_admin) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Return course progress data
  RETURN (
    SELECT json_agg(
      json_build_object(
        'course_id', cp.course_id,
        'progress_percentage', cp.progress_percentage,
        'updated_at', cp.updated_at
      )
    )
    FROM course_progress cp
    WHERE cp.user_id = p_user_id
  );
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION rpc.get_student_course_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc.get_student_course_progress(UUID) TO service_role;

-- Step 7: Function for all student dashboard data (combined)
-- Drop function if it already exists
DROP FUNCTION IF EXISTS get_student_dashboard_data(UUID);

CREATE FUNCTION get_student_dashboard_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  enrollments_data JSON;
  lesson_progress JSON;
  course_progress JSON;
BEGIN
  -- Check if caller is the user or an admin
  SELECT EXISTS (
    SELECT 1 FROM unified_profiles 
    WHERE id = auth.uid() AND admin_metadata->'roles' ? 'admin'
  ) INTO is_admin;
  
  -- Authorization check
  IF auth.uid() IS NULL OR (p_user_id != auth.uid() AND NOT is_admin) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Get enrollments data
  enrollments_data := rpc.get_student_detailed_enrollment_data(p_user_id);
  
  -- Get lesson progress
  lesson_progress := rpc.get_student_lesson_progress(p_user_id);
  
  -- Get course progress
  course_progress := rpc.get_student_course_progress(p_user_id);
  
  -- Return combined data
  RETURN json_build_object(
    'enrollments', enrollments_data,
    'lessonProgress', lesson_progress,
    'courseProgress', course_progress
  );
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION rpc.get_student_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc.get_student_dashboard_data(UUID) TO service_role;

-- Step 8: Function to check if a user is an admin
-- Drop function if it already exists
DROP FUNCTION IF EXISTS is_admin(UUID);

CREATE FUNCTION is_admin(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Use provided user ID or fall back to auth.uid()
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Check if null (not authenticated)
  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check admin status
  RETURN EXISTS (
    SELECT 1 FROM unified_profiles 
    WHERE id = target_user_id AND admin_metadata->'roles' ? 'admin'
  );
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION rpc.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc.is_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION rpc.is_admin(UUID) TO anon;
